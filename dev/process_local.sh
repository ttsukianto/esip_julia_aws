#!/bin/bash

# create a folder with current timestamp
current_time=$(date +%Y%m%d_%H%M%S)
current_time=20200615_102819
# mkdir $current_time

# move incoming files to timestamped folder
# mv incoming/* $current_time/
cp -r incoming/* $current_time/

# for every stations-params pair in timestamped folder, move to docker and run julia
for d in $current_time/*/
do
        echo "Processing folder: $current_time/$(basename $d)"
        echo "Using station file: $current_time/$(basename $d)/stations.csv"
        echo "Using xcor parameter file: $current_time/$(basename $d)/params.csv"
        # move to docker
        # docker cp $d container_id:/home/seis/.
        # run julia
        # docker exec -it
        julia run_correlation_2.jl $current_time/$(basename $d) $current_time/$(basename $d)/stations.csv $current_time/$(basename $d)/params.csv
        # move processed files back to EC2 instance
        # docker cp container_id:/home/seis/$(basename $d) $d
        # remove stations-params pair on docker
        # docker exec -it container_id rm -r $(basename $d)
        # push processed files back up to S3
        # aws s3 sync $d s3://esip-julia-aws/processed/$(basename $d)
done

# remove timestamped folder after finished
# rm -r $current_time
