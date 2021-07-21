console.log('Itee.Database.CouchBase v1.0.3 - EsModule')
import * as CoucheBaseDriver from 'couchbase';
import { TAbstractDatabase } from 'itee-database';

/**
 * @author [Ahmed DCHAR]{@link https://github.com/dragoneel}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

class TCouchBaseDatabase extends TAbstractDatabase {

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{},
            ...parameters,
            ...{
                driver: CoucheBaseDriver
            }
        };

        super( _parameters );

    }

    close ( /*onCloseCallback*/ ) {}

    connect () {

        var bucket = ( new this._driver.Cluster( 'http://localhost:8091' ) ).openBucket( 'bucketName' );

        // add a document to a bucket
        bucket.insert(
            'document-key',
            {
                name:     'Matt',
                shoeSize: 13
            },
            function ( err, result ) {
                if ( err ) {
                    this.logger.log( err );
                } else {
                    this.logger.log( result );
                }
            } );

        // get all documents with shoe size 13
        var n1ql  = 'SELECT d.* FROM `bucketName` d WHERE shoeSize = $1';
        var query = this.driver.N1qlQuery.fromString( n1ql );
        bucket.query( query, [ 13 ], function ( err, result ) {
            if ( err ) {
                this.logger.log( err );
            } else {
                this.logger.log( result );
            }
        } );

    }

    init () {
        super.init();

    }

    on ( /*eventName, callback*/ ) {}
}

export { TCouchBaseDatabase };
//# sourceMappingURL=itee-couchbase.esm.js.map
