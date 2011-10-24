module('pc.input.mouse');

function createWebKitStyleMouseEvent() {    
    return {
        button: 1,
        charCode: 0,
        bubbles: true,
        x: 0,
        y: 0,
        clientX: 0,
        clientY: 0,
        pageX: 0,
        pageY: 0,
        layerX: 0,
        layerY: 0,
        offsetX: 0,
        offsetY: 0,
        screenX: 0,
        screenY: 0,
        wheelDelta: 120,
        target: document
    };
}

function simMouseDown(mouse) {
    mouse._handleDown(createWebKitStyleMouseEvent());
}

function simMouseUp(mouse) {
    mouse._handleUp(createWebKitStyleMouseEvent());
}

function simMouseMove(mouse) {
    mouse._handleMove(createWebKitStyleMouseEvent());
}

function simMouseWheel(mouse) {
    mouse._handleWheel(createWebKitStyleMouseEvent());
}

test("Object exists", function () {
    ok(pc.input.Mouse);
});

test("mousedown: fires", function () {
    var m = new pc.input.Mouse(document.body);
    var called = false;
    
    m.bind("mousedown", function (event) {
        called = true;
        equal(event.positionX, 0);
        equal(event.positionY, 0);
        equal(event.button, 1);
        equal(event.buttons[0], false);
        equal(event.buttons[1], true);
        equal(event.buttons[2], false);
        ok(event.event);
    });
    
    simMouseDown(m);
    
    ok(called);
});

test("mouseup: fires", function () {
    var m = new pc.input.Mouse();
    m.attach(document.body);
    var called = false;
    
    m.bind("mouseup", function (event) {
        called = true;
        
        equal(event.positionX, 0);
        equal(event.positionY, 0);
        equal(event.button, 1);
        equal(event.buttons[0], false);
        equal(event.buttons[1], false);
        equal(event.buttons[2], false);
        ok(event.event);
    });
    
    simMouseUp(m);
    
    ok(called);
})

test("mousemove: fires", function () {
    var m = new pc.input.Mouse();
    m.attach(document.body);
    
    var called = false;
    
    m.bind("mousemove", function (event) {
        called = true;
        equal(event.positionX, 0);
        equal(event.positionY, 0);
        equal(event.deltaX, 0);
        equal(event.deltaY, 0);
        equal(event.buttons[0], false);
        equal(event.buttons[1], false);
        equal(event.buttons[2], false);
        ok(event.event);
    });
    
    simMouseMove(m);
    
    ok(called);    
});

test("mousewheel: fires", function () {
    var m = new pc.input.Mouse();
    m.attach(document.body)
    var called = false;
    
    m.bind("mousewheel", function (event) {
        called = true;
        equal(event.positionX, 0);
        equal(event.positionY, 0);
        equal(event.deltaWheel, 1);
        equal(event.buttons[0], false);
        equal(event.buttons[1], false);
        equal(event.buttons[2], false);
    });
    
    simMouseWheel(m);
    
    ok(called);    
});

test("getOffsetCoords", function () {
   var coords = pc.input.getOffsetCoords(createWebKitStyleMouseEvent()); 
   
   equal(coords.x, 0);
   equal(coords.y, 0);
   
});