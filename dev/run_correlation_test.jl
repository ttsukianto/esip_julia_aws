using CSV
using SQLite
using DataFrames
using SeisIO
using Dates
using SeisNoise

# Need to first process the station CSV file
csv_file = "dev/stations.csv"
# Set the column names for the station data
col_names = ["network","station","location","channel","start_time","end_time"]
# Create dataframe with station information
df_st = DataFrame( CSV.File(csv_file, header=col_names, missingstring="") )

# Oldest and youngest dates for the date dataframe
start_date = findmin( df_st.start_time )
stop_date  = findmax( df_st.end_time )
date_range = collect( Date(start_date[1]) : Dates.Day(1) : Date(stop_date[1]) )
num_days   = length(date_range) # number of days of data

# Compute the station tags
num_data    = nrow(df_st) # number of data in the IRIS query (channels are separate)
station_tag = Array{String,1}(undef,num_data)
for ii in 1:num_data
  if ismissing(df_st.location[ii])
        station_tag[ii] = string(df_st.network[ii], ".", df_st.station[ii], ".", ".", df_st.channel[ii]) # create the station ID
    else
        station_tag[ii] = string(df_st.network[ii], ".", df_st.station[ii], ".", df_st.location[ii], ".", df_st.channel[ii]) # create the station ID
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

st_starts = Array{Date,1}(df_st.start_time) # start times of each station_tag
st_ends = Array{Date,1}(df_st.end_time) # start times of each station_tag

# Now populate each row with TRUE/FALSE
for ii in 1:num_data
    print( "Adding data days for: ",station_tag[ii], "\n" )
    #idx1 = ( st_starts[ii] .<= date_range )
    #idx2 = ( st_ends[ii]   .>= date_range )
    #idx  = (idx1 + idx2 .== 2 ) # would be great to figure out how to use && above instead
    idx = ( (st_starts[ii] .<= date_range) + (st_ends[ii] .>= date_range) .== 2)
    df_date[ii, 2:num_days+1] .= idx
end

## Now let's do an example of the data download procedure on a single column

# To parallelize: We need a loop over all columns

test_col = 1000 # this column has a few stations with data on this day
print("Processing: ", date_range[test_col]," to ", date_range[test_col+1],"\n");

S = SeisData() # create empty seisdata object

t_s = Dates.Second(Dates.Day(1)).value # [s] one day in seconds
# append!(S, get_data("FDSN", station_tag[df_date[:,test_col]], src="IRIS", s=string(date_range[test_col]), t=t_s) )
get_data!(S, "FDSN", station_tag[df_date[:,test_col]], src="IRIS", s=string(date_range[test_col]), t=t_s, rr=true)

## Now let's do an example of the correlation process for those data

fs      = 20. # [Hz] resample frequency
cc_len  = 1800 # [s]
cc_step = 450 # [s]
freqmin = 0.1 # [Hz] low pass
freqmax = 9.5 # [Hz] high pass
maxlag  = 60. # [s]

# Here we need a double FOR Loop to do all data pairs
# for ii = 1:length(S)
#     for jj = ii:length(S)

ii = 1
jj = 2

S1 = SeisData(S[ii])
process_raw!(S1,fs)
S2 = SeisData(S[jj])
process_raw!(S2,fs)

# process_raw!(S, fs) # remove mean, linear detrend, downsample, time align, taper
R = RawData.([S1,S2], cc_len, cc_step)
detrend!.(R)
taper!.(R)
bandpass!.(R,freqmin,freqmax,zerophase=true)

FFT = compute_fft.(R)
whiten!.(FFT,freqmin,freqmax)
C = compute_cc(FFT[1],FFT[2],maxlag)
clean_up!(C,freqmin,freqmax)
abs_max!(C)
corrplot(C)


# Then need to save C for this date and station pair
# Need to see how Tim does this in his AWS code.

    # end # jj loop
# end # ii loop
