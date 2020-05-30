#!/bin/bash

# pull incoming files from S3
aws s3 sync s3://esip-julia-aws/incoming incoming

# delete incoming files on S3
aws s3 rm --recursive s3://esip-julia-aws/incoming

# check if incoming files exist
f_list=`find incoming -maxdepth 2 -mindepth 1 -type f`

if [ -z "$f_list" ]; then
        echo "no incoming files"
else
        # create a folder with current timestamp
        current_time=$(date +%Y%m%d_%H%M%S)
        mkdir $current_time

        # move incoming files to timestamped folder
        mv incoming/* $current_time/

        # for every stations-params pair in timestamped folder, move to docker and run julia
        for d in $current_time/*/
               do
                       # move to docker
                       docker cp $d container_id:/home/seis/.
                       # run julia
                       docker exec -it julia run_correlation.jl $(basename $d) $(basename $d)/stations.csv $(basename $d)/params.csv
                       # move processed files back to EC2 instance
                       docker cp container_id:/home/seis/$(basename $d) $d
                       # remove stations-params pair on docker
                       docker exec -it container_id rm -r $(basename $d)
                       # push processed files back up to S3
                       aws s3 sync $d s3://esip-julia-aws/processed/$(basename $d)
               done

               # remove timestamped folder after finished
               rm -r $current_time
fi
