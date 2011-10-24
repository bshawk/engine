/**
 * @name pc.resources
 * @namespace Functions for loading resources, particularly loading javascript files and attaching them to the page.
 */
pc.resources = function () {
    
    /**
     * @name pc.resources.ResourceLoader
     * @class The ResourceLoader is used to request resources from remote locations.
     * It understands specific resources types which are added by registering a ResourceHandler with a ResourceRequest. A request is made by passing a list of ResourceRequest objects to 
     * the request() method. Callbacks are provided to tell you if there were errors, notify you of progress and tell you that the batch of requests is complete.
     * @example
     *   var loader = pc.resources.ResourceLoader();
     * 	 // Add a handler for request Image resources
     *   loader.registerHandler(pc.resources.ImageRequest, new pc.resources.ImageResourceHandler());
     *   
     *   var requests = [
     *	 	new pc.resources.ImageRequest("http://example.com/image1.png")
     *	 	new pc.resources.ImageRequest("http://example.com/image2.png")
     *   ]
     * 
     * 	 loader.request(requests, function (resources) {
     * 		// Both resources are ready to use now
     * 		var image1 = resources["http://example.com/image1.png"]; // This is an Image() object
     * 		var image2 = resources["http://example.com/image2.png"];
     * 	 }, function (errors) {
     * 		errors.forEach(function (error) {
     * 			log.error(error);
     *   }, this), function (progress) {
     * 	 });
     */
    var ResourceLoader = function (options) {
    	options = options || {};
    	options.maxConcurrentRequests = options.maxConcurrentRequests || 32;
    	 
    	this._loading = [];
        this._pending = [];
		this._batches = [];
		this._handlers = {};
		this._requests = {};
		this._sequence = 1; // internal counter for sorting based on request order
		
		this._batchId = 1; // internal counter for creating batch handles.
		this._maxConcurrentRequests = options.maxConcurrentRequests;
    };

    /**
     * @function
     * @name pc.resources.ResourceLoader#registerHandler
     * @description Register a handler for a new type of resource. To register a handler you need to provided an instance of a ResourceHandler, 
     * and the ResourceRequest type to be associated with the handler.
     * @param {ResourceRequest} RequestType The type of request to associate with this handler
     * @param {ResourceHandler} handler A ResourceHandler instance.
     */
    ResourceLoader.prototype.registerHandler = function (RequestType, handler) {
    	var request = new RequestType();    	
    	if (request.constructor.name == "") {
    		throw Error("ResourceRequests must not be anonymous functions");
    	}
    	this._handlers[request.constructor.name] = handler;
    	handler.setLoader(this);
    };
    
    /**
     * @function
     * @name pc.resources.ResourceLoader#request
     * @description Request a batch of resources from a remote location. A call to request will download a batch of resources and inform you via callbacks when all resources are ready to use.
     * @param {ResourceRequest|Array} requests A ResourceRequest or array of ResourceRequests to fetch
     * @param {Number} [priority] Priority of download, lower is higher priority, default = 1
     * @param {Function} [success] Callback called after all requests have been successfully download and processed, it is passed a object containing all the resources keyed by their identitier.
     * @param {Function} [error] Callback called if there are errors while requesting resources. It is passed a list of error strings
     * @param {Function} [progress] Callback called periodically during the request process to indicate the progress of the entire request. It is passed a percentage complete value 0-100.
     * @param {Object} [options]
     * @param {Number} [options.batch] Handle for parent batch of this request. If the request is made with a parent, then the parent request will not complete until the child one has.
     * @returns {Number} A request handle which can be used to cancel the request.
     * @example
     * 
     * var loader = ResourceLoader();
     * // ... register handlers here
     * 
     * var requests = [
     * 	 new ImageRequest("http://example.com/image1.png"),
     *   new ModelRequest("http://example.com/model.json"),
     *   new EntityRequest("00000000-0000-0000-0000-000000000000")
     * ]
     * loader.request(requests, 1, function (resources) {
     * 		// resources are available here
     *		var image = resources['http://example.com/image1.png'];
 	 *      var model = resources['http://example.com/model.json'];
 	 *      var entity = resources['00000000-0000-0000-0000-000000000000'];
     * 	), function (errors) {
     * 	}, function (progress) {
     * 	});
     */
    ResourceLoader.prototype.request = function (requests, priority, success, error, progress, options) {
		var batch = null;
		
		// Re-jig arguments if priority has been left out.
    	if(typeof(priority) == "function") {
    		options = progress;
    		progress = error;
    		error = success;
    		success = priority;
    		priority = 1;
    	}
		options = options || {};
		
		// Convert single request into a list
		if (!requests.length) {
			requests = [requests]
		}
				
    	// Create a batch for this request
		batch = new RequestBatch(this._batchId++, requests, priority, success, error, progress);
        
		// If a batch handle is passed in as an option, we use it as a 'parent' to the new batch. 
		// The parent batch won't be complete until all it's children are complete.
		if (options.batch) {
			parent = this.getRequestBatch(options.batch);
			if (!parent) {
				throw new Error(pc.string.format("Cannot find batch with handle '{0}'", options.batch));
			}
			
			parent.children.push(batch);
			batch.parent = parent;
			
			// overwrite priority to match parent priority
			batch.priority = parent.priority;	
		}
    		
    	// Append each request with the batch it belongs to and the priority for easy access, 
    	// then push the requests into the pending list
    	requests.forEach(function (request, index, arr) {
	    	if (this._requests[request.identifier]) {
	    		// This resource has already been requested, append the existing request with this batch so it gets the callbacks
	    		var existingRequest = this._requests[request.identifier];
	    		existingRequest.batches.push(batch);
	    		// Update the priority to the highest of the two
	    		existingRequest.priority = Math.min(existingRequest.priority, priority);
	    	} else {
	    		// Add a new request
	    		request.batches = [];
	    		request.batches.push(batch);
	    		request.priority = batch.priority;
	    		request.sequence = this._sequence++;
	    		this._requests[request.identifier] = request;
	    		this._pending.push(request.identifier);	    		
	    	}
    	}, this);
    	
    	// sort the pending queue into priority order 
    	this._sort();
    	
    	// Store the batch
    	this._batches.push(batch);
    	
    	this._update();
    	
    	return batch.handle;
    };
	
	
	ResourceLoader.prototype.open = function (RequestType, data, success, error, progress, options) {
	   var request = new RequestType();
	   return this._handlers[request.constructor.name].open(data, success, error, progress, options);
	}
	
	/**
	 * @name pc.resources.ResourceLoader#cancel
	 * @description Cancel a request. This will remove any pending requests in the batch, the success callback will not be called.
	 * @param handle The request handle returned from the original request.
	 */
    ResourceLoader.prototype.cancel = function (handle) {
    	var index = 0;
    	var length = this._batches.length;
    	var batch;
    	for (index = 0; index < length; ++index) {
    		batch = this._batches[index];
    		if (batch.handle == handle) {
    			batch.requests.forEach(function (request, index, arr) {
    				// remove all requests from pending list
    				var index = this._pending.indexOf(request.identifier)
    				if(index >= 0) {
    					this._pending.splice(index, 1);	
    				}
    			}, this);
    		}	
    	}
    };
    
    ResourceLoader.prototype._sort = function () {
    	this._pending.sort(function (a,b) {
    		var s = this._requests[a].priority - this._requests[b].priority;
    		// If the priorities are the same, then sort on sequence order
    		if (s == 0) {
    			return this._requests[a].sequence - this._requests[b].sequence;
    		} else {
	    		return s;	
    		}
    	}.bind(this));
    };
    
    ResourceLoader.prototype._update = function () {
    	while ((this._pending.length > 0) && (this._loading.length < this._maxConcurrentRequests)) {
    		(function () {
    			// remove first request from pending list and add it to loading list
	    		var identifier = this._pending.shift();
	    		var request = this._requests[identifier];
                this._loading.push(request.identifier);
                
	    		var options = {
	    			priority: request.priority,
	    			batch: request.batches[0].handle // pass in original batch for any sub-requests to use
	    		};
	    		var handler = this._handlers[request.constructor.name];
	    		
	    		// load using handler
	    		handler.load(request.identifier, function (response, options) {
	    			// Request is now complete, remove it from map
	    			delete this._requests[identifier];

	    			// Remove request from _loading list
	    			this._loading.splice(this._loading.indexOf(request.identifier), 1);
	
					// Call open() and then postOpen() to create a new resource for each batch that requires a resource. 
					request.batches.forEach(function (batch, index, arr) {
					    var resource = handler.open(response, options);
					    handler.postOpen(resource, function (resource) {
					        // Add new resources to all batches that requested it, and check to see if the batch is now complete
					        var complete = batch.addResource(request.identifier, resource);
                            if (complete) {
                                // removed completed batch
                                this._batches.splice(this._batches.indexOf(batch), 1);
                            }
					    }.bind(this), function (errors) {
                            if (batch.error) {
                                batch.error(errors);    
                            }
                        }, function (progress) {
                            if (batch.progress) {
                                batch.progress(progress);   
                            }
                        }, options);
					}, this);
					
					// Make any new requests
	    			this._update();
	    		}.bind(this), function (errors) {
					request.batches.forEach(function (batch, index, arr) {
		    			if (batch.error) {
		    				batch.error(errors);	
		    			}
		    		}, this);
	    		}, function (progress) {
					request.batches.forEach(function (batch, index, arr) {
		    			if (batch.progress) {
		    				batch.progress(progress);	
		    			}
	    			}, this);
	    		}, options);
	    		
	    		
    		}.call(this));
    	}		        
    };
    
    ResourceLoader.prototype.getRequestBatch = function (handle) {
    	var i;
    	var length = this._batches.length;
    	for(i = 0; i < length; ++i) {
    		if(this._batches[i].handle == handle) {
    			return this._batches[i];
    		}
    	} 
    	return null;
    };
    
    /**
     * @name pc.resources.ResourceHandler
     * @class Abstract base class for ResourceHandler. The resource handler performs the request to fetch the resource from a remote location,
     * and then it converts the response into the runtime resource object type. A resource handler must implement three methods:
     * 
     * load() which fetches the resource data from a remote location (a file, a remote server, etc)
     * open() which takes the response from load() and creates a new instance of a Resource
     * postopen() which takes the opened resource and performs optional additional resource loading
     */
    var ResourceHandler = function () {
    }; 
	
	ResourceHandler.prototype.setLoader = function (loader) {
		this._loader = loader;
	};
	
	/**
	 * @function
	 * @name pc.resources.ResourceHandler#load
	 * @description Fetch the resource from a remote location and then call the success callback with the response 
	 * If an error occurs the request is stopped and the error callback is called with details of the error. 
	 * If supported the progress callback is called during the download to report percentage complete progress.
	 * @param {string} identifier A unique identifier for the resource, possibly the URL or GUID of the resource
	 * @param {Function} success Callback passed the successfully fetched resource and an options object to pass the open method
	 * @param {Function} [error] Callback passed an array of error messages if the request fails
	 * @param {Function} [progress] If supported, the progress callback is called periodically with a percentage complete value.
	 * @param {Object} [options]
	 * @param {Number} [options.priority] The priority of the request for this resource
 	 */
    ResourceHandler.prototype.load = function (identifier, success, error, progress, options) {
    	throw Error("Not implemented");
    };
    
    
	/**
	* @function
	* @name pc.resources.ResourceHandler#open
	* @description Take the data downloaded from the request and turn it into a resource object for use at runtime. 
	* For example, and ImageResourceHandler.open() will return an Image object and an EntityResourceHandler.open() will return an Entity.
	* @param data The data used to instanciate the resource
	* @param [options]
	* @param {Number} [options.priority] The priority of the request for this resource
	*/
    ResourceHandler.prototype.open = function (data, options) {
    	throw Error("Not implemented");
    };
     
    /**
     * @function
     * @name pc.resources.ResourceHandler#postOpen
     * @description Called after the open() method with the resultant resource. Used to start requests for other child resources (e.g. in EntityResourceHandler) but allows open() to remain 
     * synchronous. Default behaviour is to call success callback straight away with the resource passed in.
     * @param resource {Object} The resource returned from open()
     * @param success {Function} Success callback passed the resource
     * @param error {Function} Error callback passed a list of error messages
     * @param progress {Function} Progress callback passed percentage complete number
     * @param [options] {Object} Options specific for the resource handler, passed on from load() and open() methods
     * 
     */
    ResourceHandler.prototype.postOpen = function (resource, success, error, progress, options) {
        success(resource);
    };
    
    /**
     * @private
     * @name RequestBatch
     * @description A collection of requests that is processed together. A batch of requests provides a callback when it is completed, and a progress callback after each resource is loaded
     * @param handle The handle for this batch, an increasing int, don't reuse handles.
     * @param requests List of requests that make up this batch
     * @param priority The priority to load this batch at. Lower priority is loaded first
     * @param success The callback fired when all requests and all child batches are complete
     * @param error The callback fired if there is an error
     * @param progress The callback fired after each individual request is completed. 
     */
    var RequestBatch = function (handle, requests, priority, success, error, progress) {
		this.handle = handle;
		this.requests = requests;
		this.count = 0;
		this.resources = {};
		this.parent = null;
		this.children = [];
		this.priority = priority;
		this.success = success;
		this.error = error;
		this.progress = progress;
		this.completed = false;
    };
    
    /**
     * @private
     * @name RequestBatch#addResource
     * @description Add a resource to the completed resource list.
     * @param identifier The identifier of the new resource
     * @param resource The actual resource object, this must be one of the resources requested.
     */
    RequestBatch.prototype.addResource = function (identifier, resource) {
		this.resources[identifier] = resource;
		this.count += 1;
				
		return this._update();
    };
    
    /**
     * @private
     * @name RequestBatch#getProgress
     * @description Get a percentage value of how complete the batch is. Includes all child batches
     */
    RequestBatch.prototype.getProgress = function () {
    	return 100 * this._getCount() / this._getTotal();
    };
    
    /**
     * @private
     * @name RequestBatch#isComplete
     * @description Returns true if this batch and all it's children are complete
     */
    RequestBatch.prototype.isComplete = function () {
		var i;
		var length = this.children.length;
		for (i=0;i<length;++i) {
			if(!this.children[i].isComplete()) {
				return false;
			}
		}
		
		return (this.count == this.requests.length);
    };
    
    RequestBatch.prototype._updateProgress = function () {
        if (this.progress) {
            this.progress( this.getProgress() );    
        }
    };
    
    RequestBatch.prototype._update = function () {
        this._updateProgress();
        	
		if (this.isComplete()) {
		    this.completed = true;
			if (this.success) {
				this.success(this.resources);
			}

			if (this.parent && !this.parent.completed) {
				this.parent._update();
			}
			
			return true;
		}
		
		return false;
    }
    
    RequestBatch.prototype._getCount = function () {
    	var count = this.count;
		var i;
		var length = this.children.length;
		for (i=0;i<length;++i) {
			count += this.children[i]._getCount()
		}
		
		return count;
    }
    
    RequestBatch.prototype._getTotal = function () {
		var total = this.requests.length;
		var i;
		var length = this.children.length;
		for (i=0;i<length;++i) {
			total += this.children[i]._getTotal()
		}
		
		return total;
    }
    
    /**
     * @function
     * @name pc.resources.ResourceRequest
     * @description A request for a single resource, located by a unique identifier.
     * @param identifier Used by the request handler to locate and access the resource. Usually this will be the URL or GUID of the resource.
     */
    var ResourceRequest = function ResourceRequest(identifier) {
    	this.identifier = identifier;
    };

    var LoaderManager = function () {    
    };
    
    LoaderManager.prototype.register = function (name, loader) {
        this[name] = loader;
    };
    
    return {
        ResourceLoader: ResourceLoader,
        ResourceHandler: ResourceHandler,
        ResourceRequest: ResourceRequest,
        LoaderManager: LoaderManager
    };
} ();