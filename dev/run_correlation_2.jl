# For testing
clearconsole()
cd("/Users/dmikesell/Documents/GitHub/esip_julia_aws/dev")
using Logging
io = open("xcor_log.txt", "w")
logger = SimpleLogger(io)
global_logger(logger) # Set the global logger to logger
# ==============================================================================
@info("Loading Julia dependencies.")
using Dates # even though loaded in module, needs to be loaded here too.
using SeisIO
using Combinatorics
include("./SeisNoiseAWS.jl")
@info("Done loading Julia dependencies.")
# ==============================================================================
# Main

# Get XCOR parameters
tmp = "20200615_102819/41808/params.csv"
df_params = SeisNoiseAWS.load_parameter_file(tmp)
# df_params = SeisNoiseAWS.load_parameter_file(ARGS[3])

# Get Station information
tmp = "20200615_102819/41808/stations.csv"
df_st = SeisNoiseAWS.load_station_file(tmp)
# df_st = SeisNoiseAWS.load_station_file(ARGS[2])

# Build the data availability table
df_date = SeisNoiseAWS.build_availability_df(df_st)

# Build the COR output directory
tmp = "20200615_102819/41808/"
COR_DIR = SeisNoiseAWS.build_cor_directory(tmp)
# COR_DIR = build_cor_directory(ARGS[1])

# Make boolean vectors from each column
columns = collect( eachcol(df_date) )

t_s = Dates.Second(Dates.Day(1)).value # [s] one day in seconds

for col = 2:4 # end-1 # skip the first column, which is channel tag
    # Get the date information
    the_date    = names(df_date)[col  ]
    the_date_p1 = names(df_date)[col+1]
    @info("Processing: $the_date to $the_date_p1")

    # Create the output folder for this date
    folder_date = Dates.format(DateTime(names(df_date)[2]),"yyyy-mm-dd")
    output_dir = joinpath(COR_DIR, folder_date)
    @info("Writing daily correlations to $output_dir")

    # Download the station data for this date
    stations = columns[1][columns[col]] # array of channel_tags on this day
    @info("Downloading data for $stations")
    S = SeisData() # create empty seisdata object
    # This does the instrument deconvolution on the fly
    get_data!(S, "FDSN", stations, src="IRIS", s=the_date, t=t_s, rr=true)
    @info("Number of stations downloaded:", length(S))

end

close(io)




exit()

# ==============================================================================
# Functions
# ==============================================================================


## Now let's do an example of the data download procedure on a single column

# We need a loop over all columns (i.e. days)
# I don't think we parallelize here. To parellize I suggest we follow Tim's
# suggestion and parallelize over the double loop over stations in this day.



## Now let's do an example of the correlation process for those data






xcor_pairs = collect(combinations(S, 2))

addprocs()

@everywhere using SeisIO, SeisNoise
# @everywhere function xcor(xcor_pairs, fs, cc_len, freqmin, cc_step, freqmax, maxlag, output_dir)
@everywhere function xcor(xcor_pairs, df_params, output_dir)

    # The xcor parameters
    # fs      = df_params.fs[1] # [Hz] resample frequency
    # cc_len  = df_params.cc_len[1] # [s]
    # freqmin = df_params.freqmin[1] # [Hz] low pass
    # cc_step = df_params.cc_step[1] # [s]
    # freqmax = df_params.freqmax[1] # [Hz] high pass
    # maxlag  = df_params.maxlag[1] # [s]


    println("Correlating ", xcor_pairs[1].id," and ", xcor_pairs[2].id,"\n")

    # process_raw!(S, fs) # demean, detrend, downsample, time align, taper
    S1 = process_raw( SeisData(xcor_pairs[1]), df_params.fs[1])
    S2 = process_raw( SeisData(xcor_pairs[2]), df_params.fs[1])

    # Break into windows
    R = RawData.([S1,S2], df_params.cc_len[1], df_params.cc_step[1])

    # process each window
    detrend!.(R)
    taper!.(R)
    bandpass!.(R, df_params.freqmin[1], df_params.freqmax[1], zerophase=true)

    # Compute the FFT and correlation in frequency domain
    FFT = compute_fft.(R)
    whiten!.(FFT, df_params.freqmin[1], df_params.freqmax[1])
    C = compute_cc(FFT[1], FFT[2], df_params.maxlag[1])
    clean_up!(C, df_params.freqmin[1], df_params.freqmax[1]) # demean, detrend, taper, filter

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
