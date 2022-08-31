var Namespace = function () {

};

Namespace.definitions = {};
Namespace.queue = [];
Namespace.compiled = false;
Namespace.globalvar = null;

Namespace.global = function () {
    if (!Namespace.globalvar) {
        Namespace.globalvar = {};
        window['global' + Math.floor((Math.random() * 100000000) + 1)] = Namespace.globalvar;
    }
    return Namespace.globalvar;
}

Namespace.using = function (name, definition) {
    var parts = name.split('.');
    var parent = window;
    var currentPart = '';

    for (var i = 0, length = parts.length; i < length; i++) {
        currentPart = parts[i];
        parent[currentPart] = parent[currentPart] || {};
        parent = parent[currentPart];
    }

    var namespace = parent;

    typeof (definition) == 'function' ? definition(namespace) : false;

    return namespace;
};

Namespace.classdef = function (name, definition) {
    if (Namespace.compiled) {
        Namespace.classCompile(name, definition);
    } else {
        Namespace.queue.push({ name: name, definition: definition });
    }
};

Namespace.compile = function (callback) {
    for (var i = 0; i < Namespace.queue.length; i++) {
        var def = Namespace.queue[i];
        Namespace.classCompile(def.name, def.definition);
    }
    //Namespace.queue.clear();
    Namespace.compiled = true;
    typeof (callback) == 'function' ? callback() : false;
};

Namespace.classCompile = function (name, definition) {
    var parts = name.split('.');
    var parent = window;
    var currentPart = '';

    for (var i = 0; i < parts.length; i++) {
        currentPart = parts[i];
        if (i < parts.length - 1) {
            parent[currentPart] = parent[currentPart] || {};
            parent = parent[currentPart];
        }
    }

    if (typeof (definition) == 'function') {
        definition(function (init, proto, stat) {
            if (typeof (init) == 'object') {
                // Model is already built
                var model = init;
            } else {
                // Build model
                var model = { init: init, proto: proto, stat: stat };
            }
            if (typeof (model.init) == 'function') {
                // Insert model into definitions.
                Namespace.definitions[name] = model;

                var build = model.init;
                if (typeof (model.proto) == 'object') {
                    for (x in model.proto) {
                        build.prototype[x] = model.proto[x];
                    }
                }
                if (typeof (model.static) == 'object') {
                    for (x in model.static) {
                        build[x] = model.stat[x];
                    }
                }

                parent[currentPart] = parent[currentPart] || build;
            }
        });
    }
};

Namespace.extend = function (base) {

};
