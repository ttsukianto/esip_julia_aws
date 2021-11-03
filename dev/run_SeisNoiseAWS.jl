using Distributed
using DataFrames

# Thea: set this path to point to the correct module file
# @everywhere include("/Users/dmikesell/GIT/SeisNoiseAWS/src/SeisNoiseAWS.jl")
include("SeisNoiseAWS.jl")
@everywhere include("./SeisNoiseAWS.jl")

# Thea: if you want to run tests, you can hard code a path here to a data folder that contains params.csv and stations.csv
default_path = "/Users/dmikesell/Documents/GitHub/esip_julia_aws/dev/20200615_102819/41808/"
# default_path = "/Users/dmikesell/Documents/GitHub/esip_julia_aws/dev/20200615_102819/3470/"
# default_path = "/Users/dmikesell/Documents/GitHub/esip_julia_aws/dev/20200615_102819/12345/"

# Example of the CLI call of this Julia file.
#
# $ julia run_SeisNoiseAWS.jl /Users/dmikesell/Documents/GitHub/esip_julia_aws/dev/20200615_102819/41808/
#
# or using multiple threads (4 in this example)
#
# $ julia -p 4 run_SeisNoiseAWS.jl /Users/dmikesell/Documents/GitHub/esip_julia_aws/dev/20200615_102819/41808/

# ==============================================================================
# For testing in Atom without calling from Linux CLI.
# clearconsole()
if isempty(ARGS)
    basepath = default_path
else
    basepath = ARGS[1]
end
# ==============================================================================
using Logging
# Setup the log file
log_file = joinpath(basepath, "xcor_log.txt")
io = open(log_file, "w")
logger = SimpleLogger(io, Logging.Info)
global_logger(logger) # Set the global logger to logger
@info("Basepath: $basepath")
# ==============================================================================
# ncores = length(Sys.cpu_info())
# ntheads = Threads.nthreads()
# addprocs(ntheads) # start DEFAULT parallel threads
# addprocs(4)
num_procs = nprocs()
if num_procs == 1
    @info("Number of workers: $num_procs")
else
    @info("Number of workers: $(num_procs-1)", )
end
# ==============================================================================
using Dates # even though loaded in SeisNoiseAWS module, needs to be loaded here too.
using SeisIO
using Combinatorics
# ==============================================================================
# Load the input files from the web application
#
# Build the COR output directory
COR_DIR = SeisNoiseAWS.build_cor_directory(basepath)
# Get Station information
df_st = SeisNoiseAWS.load_station_file( joinpath(basepath, "stations.csv") )
# Get XCOR parameters
df_params = SeisNoiseAWS.load_parameter_file( joinpath(basepath, "params.csv") )
# ==============================================================================
# Build the data availability table
df_date = SeisNoiseAWS.build_availability_df(df_st)
# Make boolean vectors from each column
columns = collect( eachcol(df_date) )
# Set the file length for downloading data
t_duration = Dates.Second(Dates.Day(1)).value # [s] one day in seconds
# ==============================================================================
# Loop over days
t0a = now() # start timer
for col = 2:(DataFrames.ncol(df_date)-1) #end-1 # skip the first column, which is station tag
    if col == 1 # make sure user cannot try to use the station tag column
        continue
    end
# col = 9
# col=2 set up some if statements about num_pairs
# col=8 has a trace that is shorter than the cc_len (so need try/catch)
# col=7 has only a single station (the try/catch from above works)

# Get the date information
#the_date    = Dates.format(DateTime(string(names(df_date)[col])),"yyyy-mm-dd")  # start date
#the_date_p1 = Dates.format(DateTime(string(names(df_date)[col+1])),"yyyy-mm-dd")  # end date
the_date = string(names(df_date)[col])
the_date_p1 = string(names(df_date)[col+1])
@info("Processing: $the_date to $the_date_p1")

# Create the output folder for this date
output_dir = joinpath(COR_DIR, the_date)
@debug("Writing daily correlations to $output_dir")

# Download the station data for this date
stations = columns[1][columns[col]] # array of channel_tags on this day
@debug("Downloading data for $stations")
S = SeisData() # create empty seisdata object
# Download data if more than 1 channel
if length(stations) > 1
    # This does the instrument deconvolution on the fly
    get_data!(S, "FDSN", stations, src="IRIS", s=the_date, t=t_duration, rr=true)
end

# Build the cross-correlation pairs
xcor_pairs = collect(combinations(S, 2))

# We need a flag to build the autocorrelation pairs
# Then we need to create those and append to xcor_pairs


# Do the pair-wise cross correlation
if isempty(xcor_pairs)
    @info("Number of channels downloaded: $(length(S))")
    @info("No channel pairs to correlate.")
elseif any(x->x=="XX.FAIL..001", S.id)
    @info("Bad station request: nothing to correlate.")
else
    numpairs = length(xcor_pairs)
    @debug("Number of channel pair correlations: $numpairs")
    t1 = now()  # start timer for the parallel computation for this day
    # Do the channel pair correlations in parallel for a single day
    pmap(SeisNoiseAWS.xcor,
        xcor_pairs,
        fill(df_params, numpairs),
        fill(output_dir, numpairs))
    # SeisNoiseAWS.xcor(xcor_pairs, df_params, output_dir)

    cor_time = now() - t1 # compute time for this day
    @debug("Compute time for this correlation day: $cor_time")
end # if statement over xcor_pairs

end # the FOR loop over days

run_time = now() - t0a # total run time timer
@info("Compute time for all correlations: $run_time")

close(io) # stop logger

# exit()
