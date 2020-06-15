# AWS IAM, EC2, SNS are dependencies for AWSLambda, so install them first in order
# add https://github.com/samoconnor/AWSIAM.jl
# add https://github.com/samoconnor/AWSEC2.jl
# add https://github.com/samoconnor/AWSSNS.jl
# add https://github.com/samoconnor/FNVHash.jl
# add https://github.com/samoconnor/AWSLambda.jl


# Load AWSCore and Lambda
using AWSCore
using AWSLambda

# Deploy the below code to AWS
AWSLambda.@deploy using SeisNoise, SeisIO function corr_test()
    fs = 40. # sampling frequency in Hz
    freqmin,freqmax = 0.1,0.2 # minimum and maximum frequencies in Hz
    cc_step, cc_len = 450, 1800 # correlation step and length in S
    maxlag = 80. # maximum lag time in correlation
    S1 = get_data("IRIS","TA.V04C..BHZ",s="2006-02-01",t="2006-02-02")
    S2 = get_data("IRIS","TA.V05C..BHZ",s="2006-02-01",t="2006-02-02")
    FFT1 = compute_fft(S1,freqmin, freqmax, fs, cc_step, cc_len,
                      time_norm=false,to_whiten=false)
    FFT2 = compute_fft(S2,freqmin, freqmax, fs, cc_step, cc_len,
                      time_norm=false,to_whiten=false)
    C = compute_cc(FFT1,FFT2,maxlag,corr_type="coherence")
    clean_up!(C,freqmin,freqmax)
    abs_max!(C)
    SeisNoise.plot(C)
end

using SeisNoise, SeisIO, CSV

function corr_test_csv(csv_path)
    params = CSV.read(csv_path)
    fs = convert(Float64, params.fs[1])
    freqmin,freqmax = convert(Float64, params.freqmin[1]), convert(Float64, params.freqmax[1])
    cc_step, cc_len = convert(Int64, params.cc_step[1]), convert(Int64, params.cc_len[1])
    maxlag = convert(Float64, params.maxlag[1])
    s = "2019-02-03"
    t = "2019-02-04"
    S1 = get_data("FDSN","CI.SDD..BHZ",src="SCEDC",s=s,t=t)
    S2 = get_data("FDSN","CI.PER..BHZ",src="SCEDC",s=s,t=t)
    process_raw!(S1,fs)
    process_raw!(S2,fs)
    R = RawData.([S1,S2],cc_len,cc_step)
    detrend!.(R)
    taper!.(R)
    bandpass!.(R,freqmin,freqmax,zerophase=true)
    FFT = compute_fft.(R)
    whiten!.(FFT,freqmin,freqmax)
    C = compute_cc(FFT[1],FFT[2],maxlag)
    clean_up!(C,freqmin,freqmax)
    abs_max!(C)
    corrplot(C)
end

corr_test_csv("dev/xcor_params.csv")
