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
                # move to processed folder synced with docker 
                mv $d processed/
		# create CORR folder in advance so 
		mkdir processed/$(basename $d)/CORR
		# watch for new processed files every second
		inotifywait -m -r processed/$(basename $d)/CORR -e create | while read path action file; do 
		# check if regular file
		if [ -f "$path$file" ]; then
			# add to file list
			echo $path$file >> processed/$(basename $d)/files.txt
			# push file to s3
			aws s3 sync processed/$(basename $d) s3://esip-julia-aws/processed/$(basename $d)
		fi
		done & 
                # run julia
                docker exec -it xcor_docker julia run_SeisNoiseAWS.jl processed/$(basename $d)
		# zip processed files
		zip -r processed/$(basename $d)/$(basename $d).zip processed/$(basename $d)
		# add zip to file list
		echo processed/$(basename $d)/$(basename $d).zip >> processed/$(basename $d)/files.txt
		# append "done" to the file list to let s3 know that processing is finished
		echo done >> processed/$(basename $d)/files.txt	
		# push zip file
		aws s3 sync processed/$(basename $d) s3://esip-julia-aws/processed/$(basename $d)
		# remove processed files on EC2 instance
		rm -r processed/$(basename $d)
		# stop inotifywait
		killall inotifywait
		exit 1
        done

        # remove timestamped folder after finished
        rm -r $current_time
fi

