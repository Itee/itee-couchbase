console.log('Itee.Database.CouchBase v1.0.2 - CommonJs')
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var CoucheBaseDriver = require('couchbase');
var iteeDatabase = require('itee-database');

function _interopNamespace(e) {
	if (e && e.__esModule) return e;
	var n = Object.create(null);
	if (e) {
		Object.keys(e).forEach(function (k) {
			if (k !== 'default') {
				var d = Object.getOwnPropertyDescriptor(e, k);
				Object.defineProperty(n, k, d.get ? d : {
					enumerable: true,
					get: function () {
						return e[k];
					}
				});
			}
		});
	}
	n['default'] = e;
	return Object.freeze(n);
}

var CoucheBaseDriver__namespace = /*#__PURE__*/_interopNamespace(CoucheBaseDriver);

/**
 * @author [Ahmed DCHAR]{@link https://github.com/dragoneel}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

class TCouchBaseDatabase extends iteeDatabase.TAbstractDatabase {

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{},
            ...parameters,
            ...{
                driver: CoucheBaseDriver__namespace
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

exports.TCouchBaseDatabase = TCouchBaseDatabase;
//# sourceMappingURL=itee-couchbase.cjs.js.map
