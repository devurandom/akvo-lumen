(ns akvo.lumen.lib.visualisation.maps
  (:require [akvo.lumen.lib :as lib]
            [akvo.lumen.lib.aggregation.filter :as filter]
            [akvo.lumen.lib.visualisation.map-config :as map-config]
            [akvo.lumen.lib.visualisation.map-metadata :as map-metadata]
            [akvo.lumen.transformation.engine :as engine]
            [akvo.lumen.util :as util]
            [cheshire.core :as json]
            [clj-http.client :as client]
            [clojure.core.match :refer [match]]
            [hugsql.core :as hugsql])
  (:import [com.zaxxer.hikari HikariDataSource]
           [java.net URI]))

(hugsql/def-db-fns "akvo/lumen/lib/dataset.sql")

(defn- headers [tenant-conn]
  (let [db-uri (-> ^HikariDataSource (:datasource tenant-conn)
                   .getJdbcUrl
                   (subs 5)
                   URI.)
        {:keys [password user]} (util/query-map (.getQuery db-uri))
        port (let [p (.getPort db-uri)]
               (if (pos? p) p 5432))
        db-name (subs (.getPath db-uri) 1)]
    {"x-db-host" (.getHost db-uri)
     "x-db-last-update" (quot (System/currentTimeMillis) 1000)
     "x-db-password" password
     "x-db-port" port
     "X-db-name" db-name
     "x-db-user" user}))

(defn- check-columns
  "Make sure supplied columns are distinct and satisfy predicate."
  [p & columns]
  (and (= (count columns)
          (count (into #{} columns)))
       (every? p columns)))

(defn valid-location? [layer p]
  "Validate map spec layer."
  (let [m (into {} (remove (comp nil? val)
                           (select-keys layer ["geom" "latitude" "longitude"])))]
    (match [m]
           [({"geom" geom} :only ["geom"])] (p geom)

           [({"geom" geom "latitude" latitude} :only ["geom" "latitude"])]
           (check-columns p geom latitude)

           [({"geom" geom "longitude" longitude} :only ["geom" "longitude"])]
           (check-columns p geom longitude)

           [({"latitude" latitude "longitude" longitude}
             :only ["latitude" "longitude"])]
           (check-columns p latitude longitude)

           [{"geom" geom "latitude" latitude "longitude" longitude}]
           (check-columns p geom latitude longitude)

           :else false)))

(defn conform-create-args [layer]
  (cond
    (not (engine/valid-dataset-id? (get layer "datasetId")))
    (throw (ex-info "No valid datasetID"
                    {"reason" "No valid datasetID"}))

    (not (valid-location? layer engine/valid-column-name?))
    (throw (ex-info "Location spec not valid"
                    {"reason" "Location spec not valid"}))

    :else [(get layer "datasetId") layer]))

(defn do-create [tenant-conn windshaft-url dataset-id layer layers]
  (let [{:keys [table-name columns]} (dataset-by-id tenant-conn {:id dataset-id})
      ;  where-clause (filter/sql-str columns (get layer "filters")) ; layer-specific
        where-clause "true"
        metadata (map-metadata/build tenant-conn table-name layer where-clause) ; general
        metadata-array (map (fn [current-layer]
          (let [
            current-dataset-id (get current-layer "datasetId")
            {:keys [table-name columns]} (dataset-by-id tenant-conn {:id current-dataset-id})
            current-where-clause (filter/sql-str columns (get current-layer "filters"))]
          (map-metadata/build tenant-conn table-name current-layer current-where-clause))) layers)
        headers (headers tenant-conn) ; general
        url (format "%s/layergroup" windshaft-url) ; general
        map-config (map-config/build table-name layer metadata-array columns layers tenant-conn)
        layer-group-id (-> (client/post url {:body (json/encode map-config)
                                             :headers headers
                                             :content-type :json})
                           :body json/decode (get "layergroupid")) ; general
        ]
    (lib/ok {"layerGroupId" layer-group-id
             "metadata" metadata
             "layerMetadata" metadata-array})))

(defn create
  [tenant-conn windshaft-url dataset-id layer layers]
  (try
    (let [[dataset-id layer] (conform-create-args layer)]
      (do-create tenant-conn windshaft-url dataset-id layer layers))
    (catch Exception e
      (println e)
      (lib/bad-request (ex-data e)))))
