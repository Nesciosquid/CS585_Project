// From: https://gist.github.com/bellbind/477817982584ac8473ef/

var loadStl = (function () {
    var binaryVector3 = function (view, offset) {
        var v = new THREE.Vector3();
        v.x = view.getFloat32(offset + 0, true);
        v.y = view.getFloat32(offset + 4, true);
        v.z = view.getFloat32(offset + 8, true);
        return v;
    };
    
    var loadBinaryStl = function (buffer) {
        // binary STL
        var view = new DataView(buffer);
        var size = view.getUint32(80, true);
        var geom = new THREE.Geometry();
        var offset = 84;
        for (var i = 0; i < size; i++) {
            var normal = binaryVector3(view, offset);
            geom.vertices.push(binaryVector3(view, offset + 12));
            geom.vertices.push(binaryVector3(view, offset + 24));
            geom.vertices.push(binaryVector3(view, offset + 36));
            geom.faces.push(
                new THREE.Face3(i * 3, i * 3 + 1, i * 3 + 2, normal));
            offset += 4 * 3 * 4 + 2;
        }
        return geom;
    };

    
    var m2vec3 = function (match) {
        var v = new THREE.Vector3();
        v.x = parseFloat(match[1]);
        v.y = parseFloat(match[2]);
        v.z = parseFloat(match[3]);
        return v;
    };
    var toLines = function (array) {
        var lines = [];
        var h = 0;
        for (var i = 0; i < array.length; i++) {
            if (array[i] === 10) {
                var line = String.fromCharCode.apply(
                    null, array.subarray(h, i));
                lines.push(line);
                h = i + 1;
            }
        }
        lines.push(String.fromCharCode.apply(null, array.subarray(h)));
        return lines;
    }
    var loadTextStl = function (buffer) {
        var lines = toLines(new Uint8Array(buffer));
        var index = 0;
        var scan = function (regexp) {
            while (lines[index].match(/^\s*$/)) index++;
            var r = lines[index].match(regexp);
            return r;
        };    
        var scanOk = function (regexp) {
            var r = scan(regexp);
            if (!r) throw new Error(
                "not text stl: " + regexp.toString() + 
                "=> (line " + (index - 1) + ")" +     
                "[" + lines[index-1] + "]");
            index++;
            return r;
        }
        
        var facetReg = /^\s*facet\s+normal\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/;
        var vertexReg = /^\s*vertex\s+([^s]+)\s+([^\s]+)\s+([^\s]+)/;
        var geom = new THREE.Geometry();
        scanOk(/^\s*solid\s(.*)/);
        while (!scan(/^\s*endsolid/)) {
            var normal = scanOk(facetReg);
            scanOk(/^\s*outer\s+loop/);
            var v1 = scanOk(vertexReg);
            var v2 = scanOk(vertexReg);
            var v3 = scanOk(vertexReg);
            scanOk(/\s*endloop/);
            scanOk(/\s*endfacet/);
            var base = geom.vertices.length;
            geom.vertices.push(m2vec3(v1));
            geom.vertices.push(m2vec3(v2));
            geom.vertices.push(m2vec3(v3));
            geom.faces.push(
                new THREE.Face3(base, base + 1, base + 2, m2vec3(normal)));
        }
        return geom;
    };
    
    return function (buffer) {
        try {
            console.log("load as text stl");
            return loadTextStl(buffer);
        } catch (ex) {
            console.log(ex);
            console.log("load as binary stl");
            return loadBinaryStl(buffer);
        }
    }; 
})();
