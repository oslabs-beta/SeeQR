import { performance } from 'perf_hooks';
import { DBType, LogType } from '../../../shared/types/types';
import logger from '../utils/logging/masterlog';
import pools from '../db/poolVariables';

/*
README: "queryModel" deals with business logic of any incoming queries from the query sidebar*?. Implement furthur query functionalities here NOT ERDtable
FUNCTIONS: query, sampler
*/

// definition: for query Models
interface queryModelType {
  query: (text: string, params: (string | number)[], dbType: DBType) => any;
  sampler: (queryString: string) => Promise<number>;
}

// Functions
const queryModel: queryModelType = {
  /**
   * 'query':
   * runs sql command depending on the database
   */
  query: (text, params, dbType): Promise<unknown> | undefined => {
    logger(`Attempting to run query: \n ${text} for: \n ${dbType}`);

    if (dbType === DBType.RDSPostgres) {
      return pools.rds_pg_pool?.query(text, params).catch((err) => {
        logger(err.message, LogType.WARNING);
      });
    }

    if (dbType === DBType.RDSMySQL) {
      return pools.rds_msql_pool?.query(text, params);
    }

    if (dbType === DBType.Postgres) {
      return pools.pg_pool?.query(text, params).catch((err) => {
        logger(err.message, LogType.WARNING);
      });
    }

    if (dbType === DBType.MySQL) {
      // pools.msql_pool.query(`USE ${this.curMSQL_DB}`);
      return pools.msql_pool?.query(text, params);
    }

    if (dbType === DBType.SQLite) {
      return new Promise((resolve, reject) => {
        pools.sqlite_db?.all(text, (err, res) => {
          if (err) {
            logger(err.message, LogType.WARNING);
            reject(err);
          } else {
            resolve(res);
          }
        });
      });
    }
    return new Promise((resolve, reject) => {
      reject(Error('Invalid DB Type'));
    });
  },

  sampler: (queryString) =>
    new Promise((resolve, reject) => {
      pools.sqlite_db?.run('BEGIN', (err) => {
        if (err) {
          console.error(err.message);
          reject(err);
        } else {
          const startTime = performance.now();
          pools.sqlite_db?.all(queryString, (err1) => {
            if (err1) {
              console.error(err1.message);
              reject(err1);
            } else {
              const endTime = performance.now();
              pools.sqlite_db?.run('ROLLBACK', (err2) => {
                if (err2) {
                  console.error(err2.message);
                  reject(err2);
                } else {
                  const elapsedTime = endTime - startTime;
                  resolve(elapsedTime);
                }
              });
            }
          });
        }
      });
    }),
};

export default queryModel;
