console.log('Itee.Database.CouchBase v1.0.1 - CommonJs')
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var CoucheBaseDriver = require('couchbase');
var iteeValidators = require('itee-validators');
var path = _interopDefault(require('path'));
var buffer = require('buffer');
var fs = _interopDefault(require('fs'));
var stream = require('stream');

console.log('Itee.Database v8.0.2 - EsModule');

/**
 * @author [Tristan Valcke]{@link https://github.com/Itee}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

/* Writable memory stream */
class MemoryWriteStream extends stream.Writable {

    constructor ( options ) {

        super( options );

        const bufferSize  = options.bufferSize || buffer.kStringMaxLength;
        this.memoryBuffer = Buffer.alloc( bufferSize );
        this.offset       = 0;
    }

    _final ( callback ) {

        callback();

    }

    _write ( chunk, encoding, callback ) {

        // our memory store stores things in buffers
        const buffer = ( Buffer.isBuffer( chunk ) ) ? chunk : new Buffer( chunk, encoding );

        // concat to the buffer already there
        for ( let byteIndex = 0, numberOfByte = buffer.length ; byteIndex < numberOfByte ; byteIndex++ ) {
            this.memoryBuffer[ this.offset ] = buffer[ byteIndex ];
            this.offset++;
        }

        // Next
        callback();

    }

    _writev ( chunks, callback ) {

        for ( let chunkIndex = 0, numberOfChunks = chunks.length ; chunkIndex < numberOfChunks ; chunkIndex++ ) {
            this.memoryBuffer = Buffer.concat( [ this.memoryBuffer, chunks[ chunkIndex ] ] );
        }

        // Next
        callback();

    }

    _releaseMemory () {

        this.memoryBuffer = null;

    }

    toArrayBuffer () {

        const buffer      = this.memoryBuffer;
        const arrayBuffer = new ArrayBuffer( buffer.length );
        const view        = new Uint8Array( arrayBuffer );

        for ( let i = 0 ; i < buffer.length ; ++i ) {
            view[ i ] = buffer[ i ];
        }

        this._releaseMemory();

        return arrayBuffer

    }

    toJSON () {

        return JSON.parse( this.toString() )

    }

    toString () {

        const string = this.memoryBuffer.toString();
        this._releaseMemory();

        return string

    }

}

////////

class TAbstractFileConverter {

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                dumpType: TAbstractFileConverter.DumpType.ArrayBuffer
            }, ...parameters
        };

        this.dumpType = _parameters.dumpType;

        this._isProcessing = false;
        this._queue        = [];

    }

    get dumpType () {

        return this._dumpType

    }

    set dumpType ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Dump type cannot be null ! Expect a non empty string.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Dump type cannot be undefined ! Expect a non empty string.' ) }

        this._dumpType = value;

    }

    setDumpType ( value ) {

        this.dumpType = value;
        return this

    }

    convert ( file, parameters, onSuccess, onProgress, onError ) {

        if ( !file ) {
            onError( 'File cannot be null or empty, aborting file convertion !!!' );
            return
        }

        this._queue.push( {
            file,
            parameters,
            onSuccess,
            onProgress,
            onError
        } );

        this._processQueue();

    }

    _processQueue () {

        if ( this._queue.length === 0 || this._isProcessing ) { return }

        this._isProcessing = true;

        const self       = this;
        const dataBloc   = this._queue.shift();
        const file       = dataBloc.file;
        const parameters = dataBloc.parameters;
        const onSuccess  = dataBloc.onSuccess;
        const onProgress = dataBloc.onProgress;
        const onError    = dataBloc.onError;

        if ( iteeValidators.isString( file ) ) {

            self._dumpFileInMemoryAs(
                self._dumpType,
                file,
                parameters,
                _onDumpSuccess,
                _onProcessProgress,
                _onProcessError
            );

        } else {

            const data = file.data;

            switch ( self._dumpType ) {

                case TAbstractFileConverter.DumpType.ArrayBuffer: {

                    const bufferSize  = data.length;
                    const arrayBuffer = new ArrayBuffer( bufferSize );
                    const view        = new Uint8Array( arrayBuffer );

                    for ( let i = 0 ; i < bufferSize ; ++i ) {
                        view[ i ] = data[ i ];
                    }

                    _onDumpSuccess( arrayBuffer );

                }
                    break

                case TAbstractFileConverter.DumpType.JSON:
                    _onDumpSuccess( JSON.parse( data.toString() ) );
                    break

                case TAbstractFileConverter.DumpType.String:
                    _onDumpSuccess( data.toString() );
                    break

                default:
                    throw new RangeError( `Invalid switch parameter: ${self._dumpType}` )

            }

        }

        function _onDumpSuccess ( data ) {

            self._convert(
                data,
                parameters,
                _onProcessSuccess,
                _onProcessProgress,
                _onProcessError
            );

        }

        function _onProcessSuccess ( threeData ) {

            onSuccess( threeData );

            self._isProcessing = false;
            self._processQueue();

        }

        function _onProcessProgress ( progress ) {

            onProgress( progress );

        }

        function _onProcessError ( error ) {

            onError( error );

            self._isProcessing = false;
            self._processQueue();

        }

    }

    _dumpFileInMemoryAs ( dumpType, file, parameters, onSuccess, onProgress, onError ) {

        let isOnError = false;

        const fileReadStream = fs.createReadStream( file );

        fileReadStream.on( 'error', ( error ) => {

            isOnError = true;
            onError( error );

        } );

        const fileSize          = parseInt( parameters.fileSize );
        const memoryWriteStream = new MemoryWriteStream( { bufferSize: fileSize } );

        memoryWriteStream.on( 'error', ( error ) => {

            isOnError = true;
            onError( error );

        } );

        memoryWriteStream.on( 'finish', () => {

            if ( isOnError ) {
                return
            }

            switch ( dumpType ) {

                case TAbstractFileConverter.DumpType.ArrayBuffer:
                    onSuccess( memoryWriteStream.toArrayBuffer() );
                    break

                case TAbstractFileConverter.DumpType.String:
                    onSuccess( memoryWriteStream.toString() );
                    break

                case TAbstractFileConverter.DumpType.JSON:
                    onSuccess( memoryWriteStream.toJSON() );
                    break

                default:
                    throw new RangeError( `Invalid switch parameter: ${dumpType}` )

            }

            fileReadStream.unpipe();
            fileReadStream.close();
            memoryWriteStream.end();

        } );

        fileReadStream.pipe( memoryWriteStream );

    }

    _convert ( /*data, parameters, onSuccess, onProgress, onError*/ ) {}

}

TAbstractFileConverter.MAX_FILE_SIZE = 67108864;

TAbstractFileConverter.DumpType = Object.freeze( {
    ArrayBuffer: 0,
    String:      1,
    JSON:        2
} );

/**
 * @author [Tristan Valcke]{@link https://github.com/Itee}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

class TAbstractDatabasePlugin {

    static _registerRoutesTo ( Driver, Application, Router, ControllerCtors, descriptors ) {

        for ( let index = 0, numberOfDescriptor = descriptors.length ; index < numberOfDescriptor ; index++ ) {

            const descriptor      = descriptors[ index ];
            const ControllerClass = ControllerCtors.get( descriptor.controller.name );
            const controller      = new ControllerClass( { driver: Driver, ...descriptor.controller.options } );
            const router          = Router( { mergeParams: true } );

            console.log( `\tAdd controller for base route: ${descriptor.route}` );
            Application.use( descriptor.route, TAbstractDatabasePlugin._populateRouter( router, controller, descriptor.controller.can ) );

        }

    }

    static _populateRouter ( router, controller, can = {} ) {

        for ( let _do in can ) {

            const action = can[ _do ];

            console.log( `\t\tMap route ${action.over} on (${action.on}) to ${controller.constructor.name}.${_do} method.` );
            router[ action.on ]( action.over, controller[ _do ].bind( controller ) );

        }

        return router

    }

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                controllers: new Map(),
                descriptors: []
            }, ...parameters
        };

        this.controllers = _parameters.controllers;
        this.descriptors = _parameters.descriptors;

        this.__dirname = undefined;

    }

    get controllers () {
        return this._controllers
    }

    set controllers ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Controllers cannot be null ! Expect a map of controller.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Controllers cannot be undefined ! Expect a map of controller.' ) }
        if ( !( value instanceof Map ) ) { throw new TypeError( `Controllers cannot be an instance of ${value.constructor.name} ! Expect a map of controller.` ) }

        this._controllers = value;

    }

    get descriptors () {
        return this._descriptors
    }

    set descriptors ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Descriptors cannot be null ! Expect an array of POJO.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Descriptors cannot be undefined ! Expect an array of POJO.' ) }

        this._descriptors = value;

    }

    addController ( value ) {

        this._controllers.set( value.name, value );
        return this

    }

    addDescriptor ( value ) {

        this._descriptors.push( value );
        return this

    }

    beforeRegisterRoutes ( /*driver*/ ) {}

    registerTo ( driver, application, router ) {

        this.beforeRegisterRoutes( driver );

        TAbstractDatabasePlugin._registerRoutesTo( driver, application, router, this._controllers, this._descriptors );

    }

}

/**
 * @author [Tristan Valcke]{@link https://github.com/Itee}
 * @license [BSD-3-Clause]{@link https://opensource.org/licenses/BSD-3-Clause}
 *
 * @file Todo
 *
 * @example Todo
 *
 */

class TAbstractDatabase {

    constructor ( parameters = {} ) {

        const _parameters = {
            ...{
                driver:      null,
                application: null,
                router:      null,
                plugins:     []
            }, ...parameters
        };

        this.driver      = _parameters.driver;
        this.application = _parameters.application;
        this.router      = _parameters.router;
        this.plugins     = _parameters.plugins;

        this.init();

        this._registerPlugins();

    }

    get plugins () {

        return this._plugins

    }

    set plugins ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Plugins cannot be null ! Expect an array of TDatabasePlugin.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Plugins cannot be undefined ! Expect an array of TDatabasePlugin.' ) }

        this._plugins = value;

    }

    get router () {

        return this._router

    }

    set router ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Router cannot be null ! Expect a Express Router.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Router cannot be undefined ! Expect a Express Router.' ) }

        this._router = value;

    }

    get application () {

        return this._application

    }

    set application ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Application cannot be null ! Expect a Express Application.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Application cannot be undefined ! Expect a Express Application.' ) }

        this._application = value;

    }

    get driver () {

        return this._driver

    }

    set driver ( value ) {

        if ( iteeValidators.isNull( value ) ) { throw new TypeError( 'Driver cannot be null ! Expect a database driver.' ) }
        if ( iteeValidators.isUndefined( value ) ) { throw new TypeError( 'Driver cannot be undefined ! Expect a database driver.' ) }

        this._driver = value;

    }

    setPlugins ( value ) {

        this.plugins = value;
        return this

    }

    setRouter ( value ) {

        this.router = value;
        return this

    }

    setApplication ( value ) {

        this.application = value;
        return this

    }

    setDriver ( value ) {

        this.driver = value;
        return this

    }

    init () {}

    _registerPlugins () {

        for ( let [ name, config ] of Object.entries( this._plugins ) ) {

            if ( this._registerPackagePlugin( name, config ) ) {

                console.log( `Use ${name} plugin from node_modules` );

            } else if ( this._registerLocalPlugin( name, config ) ) {

                console.log( `Use ${name} plugin from local folder` );

            } else {

                console.error( `Unable to register the plugin ${name} the package or local folder doesn't seem to exist ! Skip it.` );

            }

        }

    }

    _registerPackagePlugin ( name ) {

        let success = false;

        try {

            const plugin = require( name );
            if ( plugin instanceof TAbstractDatabasePlugin ) {

                plugin.__dirname = path.dirname( require.resolve( name ) );
                plugin.registerTo( this._driver, this._application, this._router );

                success = true;

            } else {

                console.error( `The plugin ${name} doesn't seem to be an instance of an extended class from TAbstractDatabasePlugin ! Skip it.` );

            }

        } catch ( error ) {

            if ( !error.code || error.code !== 'MODULE_NOT_FOUND' ) {

                console.error( error );

            }

        }

        return success

    }

    _registerLocalPlugin ( name ) {

        let success = false;

        try {

            // todo use rootPath or need to resolve depth correctly !
            const localPluginPath = path.join( __dirname, '../../../', 'databases/plugins/', name, `${name}.js` );
            const plugin          = require( localPluginPath );

            if ( plugin instanceof TAbstractDatabasePlugin ) {

                plugin.__dirname = path.dirname( require.resolve( localPluginPath ) );
                plugin.registerTo( this._driver, this._application, this._router );

                success = true;

            } else {

                console.error( `The plugin ${name} doesn't seem to be an instance of an extended class from TAbstractDatabasePlugin ! Skip it.` );

            }

        } catch ( error ) {

            console.error( error );

        }

        return success

    }

    connect () {}

    close ( /*callback*/ ) {}

    on ( /*eventName, callback*/ ) {}

}

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
                    console.log( err );
                } else {
                    console.log( result );
                }
            } );

        // get all documents with shoe size 13
        var n1ql  = 'SELECT d.* FROM `bucketName` d WHERE shoeSize = $1';
        var query = this.driver.N1qlQuery.fromString( n1ql );
        bucket.query( query, [ 13 ], function ( err, result ) {
            if ( err ) {
                console.log( err );
            } else {
                console.log( result );
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
