var bucketName = "esip-julia-aws";
var bucketRegion = "us-west-2";
var IdentityPoolId = "replace with actual ID";

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

AWS.config.credentials.get();

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: bucketName }
});
