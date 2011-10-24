module("pc.fw.CameraComponent", {
    setup: function () {
        var canvas = document.getElementById("test-canvas");
        var graphicsDevice = new pc.gfx.Device(canvas);
        var programLib = new pc.gfx.ProgramLibrary();
        graphicsDevice.setCurrent();
        graphicsDevice.setProgramLibrary(programLib);
        
        //pc.graph.JsonLoader = function () {};
        var scene = new pc.graph.Scene();
        var registry = new pc.fw.ComponentRegistry();
        var manager = new pc.graph.GraphManager();
        var loaders = new pc.resources.LoaderManager();
        context = new pc.fw.ApplicationContext(manager, loaders, scene, registry);
    },
    teardown: function () {
        delete context;
    }
});

test("new", function () {
    var comp = new pc.fw.CameraComponent(context);
        
    ok(comp);
    ok(context.components.camera);
});

test("createComponent: no data", function () {
    var comp = new pc.fw.CameraComponent(context);
    var entity = new pc.fw.Entity();
    
    var componentData = comp.createComponent(entity);
    
    ok(comp);
    ok(componentData);
});
test("createComponent: data", function () {
    var comp = new pc.fw.CameraComponent(context);
    var entity = new pc.fw.Entity();
    
    var componentData = comp.createComponent(entity, {
        fov: 99
    });
    
    ok(componentData);
    equal(componentData.fov, 99);
});


test("deleteComponent: camera node deleted", function () {
    var comp = new pc.fw.CameraComponent(context);
    var entity = new pc.fw.Entity();
    
    var data = comp.createComponent(entity);
    ok(!!data.camera);
    
    comp.deleteComponent(entity);    
    equal(!!data.camera, false, "Camera node still exists");
    
});


/*

test("CameraComponent.push", function () {
    var comp = new pc.fw.CameraComponent(context);

    comp.createComponent(entity);

    comp.push(entity);

    equal(comp._current, entity);
    equal(comp._cameraStack.length, 1);
    ok(comp._camera);
});

test("CameraComponent.pop, empty stack", function () {
    var comp = new pc.fw.CameraComponent(context);
    
    equal(comp.pop(), null);    
});

test("CameraComponent.pop", function () {
    var comp = new pc.fw.CameraComponent(context);

    comp.createComponent(entity);
    comp.push(entity);

    var e = comp.pop();

    equal(e, entity);
    equal(comp._current, null);
    equal(comp._cameraStack.length, 0);
    equal(comp._camera, null);
});
*/