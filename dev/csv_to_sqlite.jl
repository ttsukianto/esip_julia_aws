using CSV
using SQLite
using DataFrames
db = SQLite.DB()
station_tbl = CSV.File("dev/stations.csv") |> SQLite.load!(db, "Station")
# TODO: param_tbl = (put xcor params here) |> SQLite.load!(db, "Param")
# data = SQLite.Query(db, "SELECT * FROM Station") |> DataFrame
