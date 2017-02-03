(ns akvo.lumen.lib.pivot-impl
  (:require [akvo.commons.psql-util]
            [akvo.lumen.http :as http]
            [akvo.lumen.lib.visualisation.filter :as filter]
            [clojure.java.jdbc :as jdbc]
            [clojure.string :as str]
            [hugsql.core :as hugsql]))

(hugsql/def-db-fns "akvo/lumen/lib/dataset.sql")

(defn unique-values-sql [table-name category-column filter-str]
  (format "SELECT DISTINCT %s FROM %s WHERE %s ORDER BY 1"
          (get category-column "columnName") table-name
          filter-str))

(defn unique-values [conn table-name category-column filter-str]
  (->> (jdbc/query conn
                   [(unique-values-sql table-name category-column filter-str)]
                   {:as-arrays? true})
       rest
       (map first)))

;; TODO filter
(defn source-sql [table-name
                  {:keys [category-column
                          row-column
                          value-column
                          aggregation]}
                  filter-str]
  (str
   (format "SELECT %s, %s, %s(%s) FROM %s WHERE %s\n"
           (get row-column "columnName")
           (get category-column "columnName")
           aggregation
           (get value-column "columnName")
           table-name
           filter-str)
   "GROUP BY 1,2 ORDER BY 1,2\n"))

(defn pivot-sql [table-name query filter-str categories-count]
  (str "SELECT * FROM crosstab ($$\n"
       (source-sql table-name query filter-str)
       "$$,$$\n"
       (unique-values-sql table-name (:category-column query) filter-str)
       "$$) AS ct (c1 text, \n"
       (str/join "," (map #(format "c%s double precision" (+ % 2))
                          (range categories-count)))
       ");"))

(defn run-query [conn dataset query filter-str]
  (let [categories (unique-values conn
                                  (:table-name dataset)
                                  (:category-column query)
                                  filter-str)
        category-columns (map (fn [title]
                                {"title" title
                                 "type" "number"})
                              categories)
        columns (cons (select-keys (:row-column query)
                                   ["title" "type"])
                      category-columns)]
    {:rows (rest
            (jdbc/query conn
                        [(pivot-sql (:table-name dataset) query filter-str (count categories))]
                        {:as-arrays? true}))
     :columns columns}))

(defn find-column [columns column-name]
  (first (filter #(= column-name (get % "columnName"))
                 columns)))

(defn build-query
  "Replace column names with proper column metadata from the dataset"
  [columns query]
  {:category-column (find-column columns (get query "categoryColumn"))
   :row-column (find-column columns (get query "rowColumn"))
   :value-column (find-column columns (get query "valueColumn"))
   :aggregation (get query "aggregation")
   :filters (get query "filters")})

(defn valid-query? [query]
  true)

(defn query [tenant-conn dataset-id query]
  (jdbc/with-db-transaction [conn tenant-conn]
    (if-let [dataset (dataset-by-id conn {:id dataset-id})]
      (let [q (build-query (:columns dataset) query)]
        (if (valid-query? q)
          (http/ok (run-query conn dataset q (filter/sql-str (:columns dataset) (:filters q))))
          (http/bad-request {"query" query})))
      (http/not-found {"datasetId" dataset-id}))))


(comment
  (def dataset-id "589346d9-9a47-4911-8365-a6023272d2bb")
  (def tenant-conn "jdbc:postgresql://localhost/lumen_tenant_1")

  (def dataset  (dataset-by-id tenant-conn {:id dataset-id}))

  (def q {"categoryColumn" "c16"
          "rowColumn" "c4"
          "valueColumn" "c19"
          "aggregation" "avg"})

  (run-query tenant-conn dataset {:category-column (second (:columns dataset))})

  (query tenant-conn dataset-id q)

  (unique-categories tenant-conn dataset-id)

  )
