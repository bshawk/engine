/**
 * Constants for shader type.
 * @enum {number}
 */
pc.gfx.ShaderType = {
    /** Vertex shader type. */
    VERTEX:   0,
    /** Fragment shader type. */
    FRAGMENT: 1
};

pc.extend(pc.gfx, function () {
    /**
     * @name pc.gfx.Shader
     * @class A program representing a compiled and linked vertex and fragment shader pair.
     * @param {pc.gfx.ShaderType} vertexShader
     * @param {String} fragmentShader
     */
    var Shader = function (type, src) {
        // Store the shader type
        this.type = type;

        // Store the shader source code
        this.src = src;

        // Create the WebGL shader ID
        var gl = pc.gfx.Device.getCurrent().gl;
        var glType = (this.type === pc.gfx.ShaderType.VERTEX) ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER;
        this.shaderId = gl.createShader(glType);

        // Compile the shader
        gl.shaderSource(this.shaderId, this.src);
        gl.compileShader(this.shaderId);

        var ok = gl.getShaderParameter(this.shaderId, gl.COMPILE_STATUS);
        if (!ok) {
            var error = gl.getShaderInfoLog(this.shaderId);
            var typeName = (this.type === pc.gfx.ShaderType.VERTEX) ? "vertex" : "fragment";
            logERROR("Failed to compile " + typeName + " shader:\n" + src + "\n" + error);
        }
    }

    /**
     * @function
     * @name pc.gfx.Shader#getType
     * @description Returns the type of the shader which can be either a vertex shader or a
     * fragment shader.
     * @returns {pc.gfx.ShaderType} A constant denoting a vertex shader or a fragment shader.
     * @example
     * var shader = new pc.gfx.Shader(pc.gfx.ShaderType.VERTEX, source);
     * var type = shader.getType();
     * if (type === pc.gfx.ShaderType.VERTEX) {
     *     console.log("This is indeed a vertex shader!");
     * }
     * @author Will Eastcott
     */
    Shader.prototype.getType = function () {
        return this.type;
    };

    /**
     * @function
     * @name pc.gfx.Shader#getSource
     * @description Returns the string object that constitutes the source code for the 
     * specified shader object.
     * @returns {String} The source code for the specified shader.
     * @example
     * var shader1 = new pc.gfx.Shader(pc.gfx.ShaderType.VERTEX, source);
     * var shader2 = new pc.gfx.Shader(pc.gfx.ShaderType.VERTEX, shader1.getSource());
     * @author Will Eastcott
     */
    Shader.prototype.getSource = function () {
        return this.src;
    };

    return {
        Shader: Shader
    }; 
}());