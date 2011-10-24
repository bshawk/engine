pc.extend(pc.resources, function () {
    /**
     * Handle requests for Entity resources
     */
    var EntityResourceHandler = function (manager, registry, depot) {
        this._manager = manager;
        this._registry = registry
        this._depot = depot;
    
    };
    EntityResourceHandler = EntityResourceHandler.extendsFrom(pc.resources.ResourceHandler);
    
    EntityResourceHandler.prototype.load = function (identifier, success, error, progress, options) {
        options = options || {};
        
        var guid = identifier;
        if(guid in pc.content.data) {
            //_loaded.call(this, pc.content.data[guid], options);
            success(pc.content.data[guid], options) 
        } else {
            this._depot.entities.getOne(guid, function (entity) {
                //_loaded.call(this, entity, options);
                success(entity, options);
            }.bind(this), function (errors) {
                error(errors);
            });
        }

        //function _loaded (entity, options) {
        //    var entity = this.open(entity, options);
        //}
    };
    
    EntityResourceHandler.prototype.open = function (data, options) {
        var guid = data.resource_id;

        options = options || {};
    	options.priority = options.priority || 1; // default priority of 1
        options.batch = options.batch || null;
        
        logINFO("Open: " + guid);

        var entity = this._manager.create(pc.fw.Entity);

        entity.setName(data.name);
        entity.setGuid(guid, this._manager);
        entity.setLocalTransform(pc.math.mat4.clone(data.transform));
        
        data.labels.forEach(function (label) {
            entity.addLabel(label);
        });
        
        // Parent and child data is stored temporarily until children are patched.
        entity.__parent = data.parent;
        entity.__children = data.children;

        entity._rev = data._rev;
        entity.version = data.version;
        entity.name = data.name;
        entity.template = data.template;
        
        entity.setRequestBatch(options.batch);
        // Load component data
        for (name in data.components) {
            if (data.components.hasOwnProperty(name)) {
                if (this._registry[name]) {
                    component = this._registry[name].createComponent(entity, data.components[name]);
                } else {
                    logWARNING(name + " Component does not exist.");
                }
            }
        }
        entity.setRequestBatch(null);
        
        return entity;
    };
    
    EntityResourceHandler.prototype.postOpen = function (entity, success, error, progress, options) {
        if(entity.__children.length) {
            // make requests for all children
            var requests = [];
            entity.__children.forEach(function (guid, index, arr) {
                requests.push(new pc.resources.EntityRequest(guid));
            });

            entity.setRequestBatch(options.batch);
            this._loader.request(requests, options.priority, function (resources) {
                this.patchChildren(entity, resources);
                success(entity);
            }.bind(this), function (errors) {
                error(errors);
            }, function (pcnt) {
                progress(pcnt);
            }, options);
            entity.setRequestBatch(null);
        } else {
            success(entity);
        }
    };
    
    EntityResourceHandler.prototype.patchChildren = function (entity, children) {
        var child;
        for(i = 0 ; i < entity.__children.length; ++i) {
            child = children[entity.__children[i]]
            entity.addChild(child);
        }    	
        delete entity.__children;
    };
    
    EntityResourceHandler.prototype.patchChildren2 = function (entity, children) {
        // patch up children list now that all entities are loaded
        var i;
        var child;
        function _get(guid) {
            var result = null;
            children.forEach(function(child) {
                if(child.getGuid() == guid) {
                    result = child;
                }
            }, this);
            return result;
        }

        for(i = 0 ; i < entity.__children.length; ++i) {
            child = _get(entity.__children[i]);
            entity.addChild(child);
        }
    };    
    
    var EntityRequest = function EntityRequest(identifier) {
    }
    EntityRequest = EntityRequest.extendsFrom(pc.resources.ResourceRequest);
    
    return {
        EntityResourceHandler: EntityResourceHandler,
        EntityRequest: EntityRequest
    }
}());