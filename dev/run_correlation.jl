print("\nloading dependencies...")

using CSV
using DataFrames
using SeisIO
using Dates
using SeisNoise
using Combinatorics
using Distributed

# Need to first process the station CSV file
print("\nreading csv files...")
# Set the column names for the station data

# Create dataframe with station information
df_st = DataFrame( CSV.File(ARGS[2], missingstring="") )
df_params = DataFrame( CSV.File(ARGS[3], missingstring="") )

# Oldest and youngest dates for the date dataframe
start_date = findmin( df_st.StartDate )
stop_date  = findmax( df_st.EndDate )
date_range = collect( Date(start_date[1]) : Dates.Day(1) : Date(stop_date[1]) )
num_days   = length(date_range) # number of days of data

# Compute the station tags
num_data    = nrow(df_st) # number of data in the IRIS query (channels are separate)
station_tag = Array{String,1}(undef,num_data)
for ii in 1:num_data
  if ismissing(df_st.Location[ii])
        station_tag[ii] = string(df_st.Network[ii], ".", df_st.Station[ii], ".", ".", df_st.Channel[ii]) # create the station ID
    else
        station_tag[ii] = string(df_st.Network[ii], ".", df_st.Station[ii], ".", df_st.Location[ii], ".", df_st.Channel[ii]) # create the station ID
    end
    print("Creating tag: ", station_tag[ii],"\n")
end

# Create the station vs. date dataframe
df_date = DataFrame()
df_date[!, Symbol("station_tag")] = station_tag # column 1 is the station_tag
# add the other column names and set column values
for d in date_range
    df_date[!, Symbol(d)] .= false
end

st_ends   = Array{Date,1}(df_st.EndDate) # start times of each station_tag
st_starts = Array{Date,1}(df_st.StartDate) # start times of each station_tag

# Now populate each row with TRUE/FALSE
for ii in 1:num_data
    print("Adding data days for: ", station_tag[ii], "\n")
    idx = ( (st_starts[ii] .<= date_range) + (st_ends[ii] .>= date_range) .== 2)
    df_date[ii, 2:num_days+1] .= idx
end

## Now let's do an example of the data download procedure on a single column

# We need a loop over all columns (i.e. days)
# I don't think we parallelize here. To parellize I suggest we follow Tim's
# suggestion and parallelize over the double loop over stations in this day.

test_col = 100 # this column has a few stations with data on this day
print("Processing: ", date_range[test_col]," to ", date_range[test_col+1],"\n");

S = SeisData() # create empty seisdata object

t_s = Dates.Second(Dates.Day(1)).value # [s] one day in seconds
the_date = string(date_range[test_col])
get_data!(S, "FDSN", station_tag[df_date[:,test_col]], src="IRIS", s=the_date, t=t_s, rr=true)
# This does the instrument deconvolution on the fly

## Now let's do an example of the correlation process for those data

fs      = Float64(df_params.fs[1]) # [Hz] resample frequency
cc_len  = df_params.cc_len[1] # [s]
freqmin = df_params.freqmin[1] # [Hz] low pass
cc_step = df_params.cc_step[1] # [s]
freqmax = df_params.freqmax[1] # [Hz] high pass
maxlag  = df_params.maxlag[1] # [s]

# Save correlation files to this directory
COR_DIR = joinpath("../SeisNoiseAWS.jl/example/20200615_102819/41808/", "CORR") # local path
if !isdir(COR_DIR) # make the local directoy if necessary
    mkpath(COR_DIR)
end
output_dir = joinpath(COR_DIR, the_date)

xcor_pairs = collect(combinations(S, 2))

# Here we need a double FOR Loop to do all data pairs
# Can we do something else, where we do a pmap

print("\nstarting parallelization...")

addprocs()

@everywhere using SeisIO, SeisNoise
@everywhere function xcor(xcor_pairs, fs, cc_len, freqmin, cc_step, freqmax, maxlag, output_dir)
    print("Correlating ", xcor_pairs[1].id," and ", xcor_pairs[2].id,"\n")
    # process_raw!(S, fs) # demean, detrend, downsample, time align, taper
    S1 = process_raw( SeisData(xcor_pairs[1]), fs)
    S2 = process_raw( SeisData(xcor_pairs[2]), fs)
    # Break into windows
    R = RawData.([S1,S2], cc_len, cc_step)
    # process each window
    detrend!.(R)
    taper!.(R)
    bandpass!.(R,freqmin,freqmax,zerophase=true)
    # Compute the FFT and correlation in frequency domain
    FFT = compute_fft.(R)
    whiten!.(FFT,freqmin,freqmax)
    C = compute_cc(FFT[1],FFT[2],maxlag)
    clean_up!(C,freqmin,freqmax) # demean, detrend, taper, filter

    # Then need to save C for this date and station pair
    # Need to see how Tim does this in his AWS code.

    save_corr(C, output_dir) # Write the complete correlation object

    # abs_max!(C)
    # corrplot(C)
    # stack!( C )

    # deallocate (not sure how much this helps or not)
    S1 = nothing
    S2 = nothing
    R = nothing
end

numpairs = length(xcor_pairs)
t1 = now()

pmap(xcor, xcor_pairs, fill(fs, numpairs), fill(cc_len, numpairs), fill(freqmin, numpairs), fill(cc_step, numpairs), fill(freqmax, numpairs), fill(maxlag, numpairs), fill(output_dir, numpairs))

t2 = now()
print("Compute time: ",t2-t1)

