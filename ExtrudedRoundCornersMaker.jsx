/**
 * Extruded Round Corners Maker v1.0.0
 * Adobe After Effects Script & ScriptUI Panel
 * 
 * Features:
 * - 2D & 3D Extruded Rounded Rectangle generator with independent corner radii.
 * - Non-C4D / Classic 3D native geometry: 2D segment strips (6-24 segments per corner arc).
 * - Animatable via Timeline & Expressions: Width, Height, Depth, Segments, Radii, Colors.
 * - Anti-gap & anti-clipping precision math (Seam overlap & Cap offset prevents Z-fighting).
 * - Screen / Composition reproduction on caps with auto-fit, auto-fill, stretch, alignment & offsets.
 * 
 * Compatible with Adobe After Effects CC 2018 through 2026+.
 * Distribution-ready for Adobe Exchange / aescripts.com
 */

(function (thisObj) {

    // Global settings & defaults
    var SCRIPT_NAME = "Extruded Round Corners Maker";
    var SCRIPT_VERSION = "1.0.0";

    // Helper: Hex string to [R, G, B, A] normalized (0-1)
    function hexToRgba(hex, alpha) {
        if (alpha === undefined) alpha = 1.0;
        hex = hex.replace("#", "");
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var r = parseInt(hex.substring(0, 2), 16) / 255;
        var g = parseInt(hex.substring(2, 4), 16) / 255;
        var b = parseInt(hex.substring(4, 6), 16) / 255;
        return [r, g, b, alpha];
    }

    // Helper: Normalized [R, G, B] to Hex
    function rgbaToHex(rgba) {
        var r = Math.round((rgba[0] || 0) * 255).toString(16);
        var g = Math.round((rgba[1] || 0) * 255).toString(16);
        var b = Math.round((rgba[2] || 0) * 255).toString(16);
        if (r.length === 1) r = "0" + r;
        if (g.length === 1) g = "0" + g;
        if (b.length === 1) b = "0" + b;
        return "#" + r + g + b;
    }

    // Expression templates
    var EXPRESSIONS = {

        // Expression for Cap shape path (Top and Bottom caps)
        capPath: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var W = Math.max(1, ctrl.effect("Width")("Slider").value);',
            'var H = Math.max(1, ctrl.effect("Height")("Slider").value);',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rTL = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Left")("Slider").value);',
            'var rTR = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Right")("Slider").value);',
            'var rBR = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Right")("Slider").value);',
            'var rBL = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Left")("Slider").value);',
            '',
            '// Proportional clamping to prevent corner overlap',
            'var maxTop = rTL + rTR; if (maxTop > W) { var s = W / maxTop; rTL *= s; rTR *= s; }',
            'var maxBot = rBL + rBR; if (maxBot > W) { var s = W / maxBot; rBL *= s; rBR *= s; }',
            'var maxLeft = rTL + rBL; if (maxLeft > H) { var s = H / maxLeft; rTL *= s; rBL *= s; }',
            'var maxRight = rTR + rBR; if (maxRight > H) { var s = H / maxRight; rTR *= s; rBR *= s; }',
            '',
            'var k = 0.5522847498;',
            'var kTL = rTL * k;',
            'var kTR = rTR * k;',
            'var kBR = rBR * k;',
            'var kBL = rBL * k;',
            '',
            'var pts = [',
            '  [-W/2 + rTL, -H/2],',
            '  [W/2 - rTR, -H/2],',
            '  [W/2, -H/2 + rTR],',
            '  [W/2, H/2 - rBR],',
            '  [W/2 - rBR, H/2],',
            '  [-W/2 + rBL, H/2],',
            '  [-W/2, H/2 - rBL],',
            '  [-W/2, -H/2 + rTL]',
            '];',
            '',
            'var inT = [',
            '  [-kTL, 0],',
            '  [0, 0],',
            '  [0, -kTR],',
            '  [0, 0],',
            '  [kBR, 0],',
            '  [0, 0],',
            '  [0, kBL],',
            '  [0, 0]',
            '];',
            '',
            'var outT = [',
            '  [0, 0],',
            '  [kTR, 0],',
            '  [0, 0],',
            '  [0, kBR],',
            '  [0, 0],',
            '  [-kBL, 0],',
            '  [0, 0],',
            '  [0, -kTL]',
            '];',
            '',
            'createPath(pts, inT, outT, true);'
        ].join('\n'),

        // Top Cap Z-Position (anti-clipping slight offset)
        capTopPos: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var off = ctrl.effect("Cap Z-Offset (px)")("Slider").value;',
            'var d = ctrl.effect("Extrusion Depth")("Slider").value;',
            '[0, 0, (d >= 0 ? -off : off)];'
        ].join('\n'),

        // Bottom Cap Z-Position and visibility
        capBottomPos: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var off = ctrl.effect("Cap Z-Offset (px)")("Slider").value;',
            'var d = ctrl.effect("Extrusion Depth")("Slider").value;',
            '[0, 0, d + (d >= 0 ? off : -off)];'
        ].join('\n'),

        capBottomOpacity: [
            'var ctrl = thisComp.layer("Master Controller");',
            'ctrl.effect("Extruded")("Checkbox").value > 0 ? 100 : 0;'
        ].join('\n'),

        // Straight Walls
        straightWallOpacity: [
            'var ctrl = thisComp.layer("Master Controller");',
            'ctrl.effect("Extruded")("Checkbox").value > 0 ? 100 : 0;'
        ].join('\n'),

        topWallSize: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var W = Math.max(1, ctrl.effect("Width")("Slider").value);',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rTL = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Left")("Slider").value);',
            'var rTR = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Right")("Slider").value);',
            'var maxTop = rTL + rTR; if (maxTop > W) { var s = W / maxTop; rTL *= s; rTR *= s; }',
            'var seam = ctrl.effect("Seam Overlap (px)")("Slider").value;',
            'var d = Math.abs(ctrl.effect("Extrusion Depth")("Slider").value);',
            '[Math.max(0.1, W - rTL - rTR + seam), Math.max(0.1, d)];'
        ].join('\n'),

        topWallPos: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var W = ctrl.effect("Width")("Slider").value;',
            'var H = ctrl.effect("Height")("Slider").value;',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rTL = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Left")("Slider").value);',
            'var rTR = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Right")("Slider").value);',
            'var maxTop = rTL + rTR; if (maxTop > W) { var s = W / maxTop; rTL *= s; rTR *= s; }',
            'var d = ctrl.effect("Extrusion Depth")("Slider").value;',
            '[(rTL - rTR) / 2, -H / 2, d / 2];'
        ].join('\n'),

        bottomWallSize: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var W = Math.max(1, ctrl.effect("Width")("Slider").value);',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rBL = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Left")("Slider").value);',
            'var rBR = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Right")("Slider").value);',
            'var maxBot = rBL + rBR; if (maxBot > W) { var s = W / maxBot; rBL *= s; rBR *= s; }',
            'var seam = ctrl.effect("Seam Overlap (px)")("Slider").value;',
            'var d = Math.abs(ctrl.effect("Extrusion Depth")("Slider").value);',
            '[Math.max(0.1, W - rBL - rBR + seam), Math.max(0.1, d)];'
        ].join('\n'),

        bottomWallPos: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var W = ctrl.effect("Width")("Slider").value;',
            'var H = ctrl.effect("Height")("Slider").value;',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rBL = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Left")("Slider").value);',
            'var rBR = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Right")("Slider").value);',
            'var maxBot = rBL + rBR; if (maxBot > W) { var s = W / maxBot; rBL *= s; rBR *= s; }',
            'var d = ctrl.effect("Extrusion Depth")("Slider").value;',
            '[(rBL - rBR) / 2, H / 2, d / 2];'
        ].join('\n'),

        leftWallSize: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var H = Math.max(1, ctrl.effect("Height")("Slider").value);',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rTL = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Left")("Slider").value);',
            'var rBL = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Left")("Slider").value);',
            'var maxLeft = rTL + rBL; if (maxLeft > H) { var s = H / maxLeft; rTL *= s; rBL *= s; }',
            'var seam = ctrl.effect("Seam Overlap (px)")("Slider").value;',
            'var d = Math.abs(ctrl.effect("Extrusion Depth")("Slider").value);',
            '[Math.max(0.1, H - rTL - rBL + seam), Math.max(0.1, d)];'
        ].join('\n'),

        leftWallPos: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var W = ctrl.effect("Width")("Slider").value;',
            'var H = ctrl.effect("Height")("Slider").value;',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rTL = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Left")("Slider").value);',
            'var rBL = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Left")("Slider").value);',
            'var maxLeft = rTL + rBL; if (maxLeft > H) { var s = H / maxLeft; rTL *= s; rBL *= s; }',
            'var d = ctrl.effect("Extrusion Depth")("Slider").value;',
            '[-W / 2, (rTL - rBL) / 2, d / 2];'
        ].join('\n'),

        rightWallSize: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var H = Math.max(1, ctrl.effect("Height")("Slider").value);',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rTR = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Right")("Slider").value);',
            'var rBR = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Right")("Slider").value);',
            'var maxRight = rTR + rBR; if (maxRight > H) { var s = H / maxRight; rTR *= s; rBR *= s; }',
            'var seam = ctrl.effect("Seam Overlap (px)")("Slider").value;',
            'var d = Math.abs(ctrl.effect("Extrusion Depth")("Slider").value);',
            '[Math.max(0.1, H - rTR - rBR + seam), Math.max(0.1, d)];'
        ].join('\n'),

        rightWallPos: [
            'var ctrl = thisComp.layer("Master Controller");',
            'var W = ctrl.effect("Width")("Slider").value;',
            'var H = ctrl.effect("Height")("Slider").value;',
            'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
            'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
            'var rTR = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Right")("Slider").value);',
            'var rBR = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Right")("Slider").value);',
            'var maxRight = rTR + rBR; if (maxRight > H) { var s = H / maxRight; rTR *= s; rBR *= s; }',
            'var d = ctrl.effect("Extrusion Depth")("Slider").value;',
            '[W / 2, (rTR - rBR) / 2, d / 2];'
        ].join('\n'),

        // Corner Arc Segments Generator Expression
        // corner: 'TL', 'TR', 'BR', 'BL'; index: k (0 to segMax - 1)
        cornerSegmentSize: function (corner) {
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var W = Math.max(1, ctrl.effect("Width")("Slider").value);',
                'var H = Math.max(1, ctrl.effect("Height")("Slider").value);',
                'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
                'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
                'var rTL = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Left")("Slider").value);',
                'var rTR = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Right")("Slider").value);',
                'var rBR = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Right")("Slider").value);',
                'var rBL = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Left")("Slider").value);',
                'var maxTop = rTL + rTR; if (maxTop > W) { var s = W / maxTop; rTL *= s; rTR *= s; }',
                'var maxBot = rBL + rBR; if (maxBot > W) { var s = W / maxBot; rBL *= s; rBR *= s; }',
                'var maxLeft = rTL + rBL; if (maxLeft > H) { var s = H / maxLeft; rTL *= s; rBL *= s; }',
                'var maxRight = rTR + rBR; if (maxRight > H) { var s = H / maxRight; rTR *= s; rBR *= s; }',
                'var R = ' + (corner === 'TL' ? 'rTL' : corner === 'TR' ? 'rTR' : corner === 'BR' ? 'rBR' : 'rBL') + ';',
                'var S = Math.max(6, Math.min(24, Math.round(ctrl.effect("Corner Segments")("Slider").value)));',
                'var seam = ctrl.effect("Seam Overlap (px)")("Slider").value;',
                'var d = Math.abs(ctrl.effect("Extrusion Depth")("Slider").value);',
                'var chordW = (R > 0.1) ? (2 * R * Math.sin(Math.PI / (4 * S)) + seam) : 0;',
                '[Math.max(0.1, chordW), Math.max(0.1, d)];'
            ].join('\n');
        },

        cornerSegmentPos: function (corner, k) {
            var startAngle = this.cornerStartAngle(corner);
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var W = Math.max(1, ctrl.effect("Width")("Slider").value);',
                'var H = Math.max(1, ctrl.effect("Height")("Slider").value);',
                'var link = ctrl.effect("Link Radii")("Checkbox").value > 0;',
                'var rAll = Math.max(0, ctrl.effect("Radius All")("Slider").value);',
                'var rTL = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Left")("Slider").value);',
                'var rTR = Math.max(0, link ? rAll : ctrl.effect("Radius Top-Right")("Slider").value);',
                'var rBR = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Right")("Slider").value);',
                'var rBL = Math.max(0, link ? rAll : ctrl.effect("Radius Bottom-Left")("Slider").value);',
                'var maxTop = rTL + rTR; if (maxTop > W) { var s = W / maxTop; rTL *= s; rTR *= s; }',
                'var maxBot = rBL + rBR; if (maxBot > W) { var s = W / maxBot; rBL *= s; rBR *= s; }',
                'var maxLeft = rTL + rBL; if (maxLeft > H) { var s = H / maxLeft; rTL *= s; rBL *= s; }',
                'var maxRight = rTR + rBR; if (maxRight > H) { var s = H / maxRight; rTR *= s; rBR *= s; }',
                'var R = ' + (corner === 'TL' ? 'rTL' : corner === 'TR' ? 'rTR' : corner === 'BR' ? 'rBR' : 'rBL') + ';',
                'var S = Math.max(6, Math.min(24, Math.round(ctrl.effect("Corner Segments")("Slider").value)));',
                'var d = ctrl.effect("Extrusion Depth")("Slider").value;',
                'var delta = (Math.PI / 2) / S;',
                'var phi = ' + startAngle + ' + (' + k + ' + 0.5) * delta;',
                'var rChord = R * Math.cos(delta / 2);',
                'var cx = ' + this.cornerCenterX(corner) + ';',
                'var cy = ' + this.cornerCenterY(corner) + ';',
                '[cx + rChord * Math.cos(phi), cy + rChord * Math.sin(phi), d / 2];'
            ].join('\n');
        },

        cornerSegmentRotZ: function (corner, k) {
            var startAngle = this.cornerStartAngle(corner);
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var S = Math.max(6, Math.min(24, Math.round(ctrl.effect("Corner Segments")("Slider").value)));',
                'var delta = (Math.PI / 2) / S;',
                'var phi = ' + startAngle + ' + (' + k + ' + 0.5) * delta;',
                '(phi * 180 / Math.PI) + 90;'
            ].join('\n');
        },

        cornerSegmentOpacity: function (k) {
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var isExt = ctrl.effect("Extruded")("Checkbox").value > 0;',
                'var S = Math.max(6, Math.min(24, Math.round(ctrl.effect("Corner Segments")("Slider").value)));',
                '(isExt && (' + k + ' < S)) ? 100 : 0;'
            ].join('\n');
        },

        cornerSegmentColor: function (corner, k) {
            var startAngle = this.cornerStartAngle(corner);
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var baseCol = ctrl.effect("Edge Color")("Color").value;',
                'var shd = ctrl.effect("Shading Intensity")("Slider").value / 100;',
                'var S = Math.max(6, Math.min(24, Math.round(ctrl.effect("Corner Segments")("Slider").value)));',
                'var delta = (Math.PI / 2) / S;',
                'var phi = ' + startAngle + ' + (' + k + ' + 0.5) * delta;',
                '// Subtle cylindrical ambient lighting simulation',
                'var lightFactor = 1 - Math.cos(phi) * shd * 0.5;',
                'lightFactor = Math.max(0.2, Math.min(1.4, lightFactor));',
                '[baseCol[0] * lightFactor, baseCol[1] * lightFactor, baseCol[2] * lightFactor, baseCol[3]];'
            ].join('\n');
        },

        // Helper calculations for corners
        cornerParamName: function (corner) {
            switch (corner) {
                case 'TL': return 'Radius Top-Left';
                case 'TR': return 'Radius Top-Right';
                case 'BR': return 'Radius Bottom-Right';
                case 'BL': return 'Radius Bottom-Left';
            }
            return 'Radius All';
        },

        cornerClampSnippet: function (corner) {
            switch (corner) {
                case 'TL': return 'R = Math.min(R, Math.min(W / 2, H / 2));';
                case 'TR': return 'R = Math.min(R, Math.min(W / 2, H / 2));';
                case 'BR': return 'R = Math.min(R, Math.min(W / 2, H / 2));';
                case 'BL': return 'R = Math.min(R, Math.min(W / 2, H / 2));';
            }
            return '';
        },

        cornerStartAngle: function (corner) {
            switch (corner) {
                case 'TL': return '-Math.PI';
                case 'TR': return '-Math.PI / 2';
                case 'BR': return '0';
                case 'BL': return 'Math.PI / 2';
            }
            return '0';
        },

        cornerCenterX: function (corner) {
            switch (corner) {
                case 'TL': return '-W / 2 + R';
                case 'TR': return 'W / 2 - R';
                case 'BR': return 'W / 2 - R';
                case 'BL': return '-W / 2 + R';
            }
            return '0';
        },

        cornerCenterY: function (corner) {
            switch (corner) {
                case 'TL': return '-H / 2 + R';
                case 'TR': return '-H / 2 + R';
                case 'BR': return 'H / 2 - R';
                case 'BL': return 'H / 2 - R';
            }
            return '0';
        },

        // Screen Position Expression
        screenPos: function (isBack) {
            var prefix = isBack ? "Back" : "Front";
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var W = ctrl.effect("Width")("Slider").value;',
                'var H = ctrl.effect("Height")("Slider").value;',
                'var d = ctrl.effect("Extrusion Depth")("Slider").value;',
                'var align = Math.round(ctrl.effect("' + prefix + ' Screen Alignment")("Slider").value);',
                'var off = ctrl.effect("' + prefix + ' Screen Offset")("Point").value;',
                'var capOff = ctrl.effect("Cap Z-Offset (px)")("Slider").value;',
                '',
                '// 0: Center, 1: TL, 2: TC, 3: TR, 4: CL, 5: CR, 6: BL, 7: BC, 8: BR',
                'var ax = 0, ay = 0;',
                'switch (align) {',
                '  case 1: ax = -W/2; ay = -H/2; break;',
                '  case 2: ax = 0;    ay = -H/2; break;',
                '  case 3: ax = W/2;  ay = -H/2; break;',
                '  case 4: ax = -W/2; ay = 0;    break;',
                '  case 5: ax = W/2;  ay = 0;    break;',
                '  case 6: ax = -W/2; ay = H/2;  break;',
                '  case 7: ax = 0;    ay = H/2;  break;',
                '  case 8: ax = W/2;  ay = H/2;  break;',
                '  default: ax = 0;   ay = 0;    break;',
                '}',
                '',
                'var zBase = ' + (isBack ? 'd + (d >= 0 ? capOff + 0.1 : -capOff - 0.1)' : '(d >= 0 ? -capOff - 0.1 : capOff + 0.1)') + ';',
                '[ax + off[0], ay + off[1], zBase];'
            ].join('\n');
        },

        // Screen Scale Expression
        screenScale: function (isBack) {
            var prefix = isBack ? "Back" : "Front";
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var W = Math.max(1, ctrl.effect("Width")("Slider").value);',
                'var H = Math.max(1, ctrl.effect("Height")("Slider").value);',
                'var mode = Math.round(ctrl.effect("' + prefix + ' Screen Scale Mode")("Slider").value);',
                'var man = ctrl.effect("' + prefix + ' Screen Scale")("Slider").value / 100;',
                'var sw = sourceRectAtTime().width;',
                'var sh = sourceRectAtTime().height;',
                'if (sw <= 0) sw = 1920; if (sh <= 0) sh = 1080;',
                '',
                '// 0: Manual, 1: Fit Inside, 2: Fill / Cover, 3: Stretch',
                'var sx = 100, sy = 100;',
                'if (mode === 1) {',
                '  var fit = Math.min(W / sw, H / sh) * 100 * man;',
                '  sx = fit; sy = fit;',
                '} else if (mode === 2) {',
                '  var fill = Math.max(W / sw, H / sh) * 100 * man;',
                '  sx = fill; sy = fill;',
                '} else if (mode === 3) {',
                '  sx = (W / sw) * 100 * man;',
                '  sy = (H / sh) * 100 * man;',
                '} else {',
                '  sx = 100 * man; sy = 100 * man;',
                '}',
                '[sx, sy, 100];'
            ].join('\n');
        },

        screenAnchor: function (isBack) {
            var prefix = isBack ? "Back" : "Front";
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var align = Math.round(ctrl.effect("' + prefix + ' Screen Alignment")("Slider").value);',
                'var sr = sourceRectAtTime();',
                'var l = sr.left, t = sr.top, w = sr.width, h = sr.height;',
                'var ax = l + w / 2, ay = t + h / 2;',
                'switch (align) {',
                '  case 1: ax = l;         ay = t;         break;',
                '  case 2: ax = l + w / 2; ay = t;         break;',
                '  case 3: ax = l + w;     ay = t;         break;',
                '  case 4: ax = l;         ay = t + h / 2; break;',
                '  case 5: ax = l + w;     ay = t + h / 2; break;',
                '  case 6: ax = l;         ay = t + h;     break;',
                '  case 7: ax = l + w / 2; ay = t + h;     break;',
                '  case 8: ax = l + w;     ay = t + h;     break;',
                '  default: ax = l + w / 2; ay = t + h / 2; break;',
                '}',
                '[ax, ay, 0];'
            ].join('\n');
        },

        screenOpacity: function (isBack) {
            var prefix = isBack ? "Back" : "Front";
            return [
                'var ctrl = thisComp.layer("Master Controller");',
                'var en = ctrl.effect("' + prefix + ' Screen Enabled")("Checkbox").value > 0;',
                'en ? ctrl.effect("' + prefix + ' Screen Opacity")("Slider").value : 0;'
            ].join('\n');
        }
    };

    // Rig Builder Function
    function buildExtrusionRig(params) {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select or open an active composition first.", SCRIPT_NAME);
            return null;
        }

        app.beginUndoGroup("Create Extruded Round Corners");

        try {
            var targetComp = comp;
            var masterCompLayer = null;

            // If user wants a dedicated 3D precomp
            if (params.targetMode === "precomp") {
                var precompName = "Extruded_Round_Corners_" + (app.project.numItems + 1);
                var precomp = app.project.items.addComp(
                    precompName,
                    comp.width,
                    comp.height,
                    comp.pixelAspect,
                    comp.duration,
                    comp.frameRate
                );
                // Add precomp to current comp
                masterCompLayer = comp.layers.add(precomp);
                masterCompLayer.threeDLayer = true;
                masterCompLayer.collapseTransformation = true; // Essential for 3D nested layers
                targetComp = precomp;
            }

            // 1. Create Master Controller 3D Null
            var ctrl = targetComp.layers.addNull();
            ctrl.name = "Master Controller";
            ctrl.threeDLayer = true;
            ctrl.position.setValue([targetComp.width / 2, targetComp.height / 2, 0]);

            // Add Custom Controls to Master Controller
            // Geometry Group
            var fxExtruded = ctrl.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control");
            fxExtruded.name = "Extruded";
            fxExtruded.property(1).setValue(params.isExtruded ? 1 : 0);

            var fxWidth = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxWidth.name = "Width";
            fxWidth.property(1).setValue(params.width);

            var fxHeight = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxHeight.name = "Height";
            fxHeight.property(1).setValue(params.height);

            var fxLink = ctrl.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control");
            fxLink.name = "Link Radii";
            fxLink.property(1).setValue(params.linkRadii ? 1 : 0);

            var fxRadAll = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxRadAll.name = "Radius All";
            fxRadAll.property(1).setValue(params.radiusAll);

            var fxRadTL = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxRadTL.name = "Radius Top-Left";
            fxRadTL.property(1).setValue(params.radiusTL);

            var fxRadTR = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxRadTR.name = "Radius Top-Right";
            fxRadTR.property(1).setValue(params.radiusTR);

            var fxRadBR = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxRadBR.name = "Radius Bottom-Right";
            fxRadBR.property(1).setValue(params.radiusBR);

            var fxRadBL = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxRadBL.name = "Radius Bottom-Left";
            fxRadBL.property(1).setValue(params.radiusBL);

            // Extrusion Group
            var fxDepth = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxDepth.name = "Extrusion Depth";
            fxDepth.property(1).setValue(params.depth);

            var fxSegments = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxSegments.name = "Corner Segments";
            fxSegments.property(1).setValue(params.segments);

            var fxSeam = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxSeam.name = "Seam Overlap (px)";
            fxSeam.property(1).setValue(params.seamOverlap);

            var fxCapOff = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxCapOff.name = "Cap Z-Offset (px)";
            fxCapOff.property(1).setValue(params.capOffset);

            // Colors Group
            var fxCapTopCol = ctrl.property("ADBE Effect Parade").addProperty("ADBE Color Control");
            fxCapTopCol.name = "Cap Top Color";
            fxCapTopCol.property(1).setValue(params.capTopColor);

            var fxCapBotCol = ctrl.property("ADBE Effect Parade").addProperty("ADBE Color Control");
            fxCapBotCol.name = "Cap Bottom Color";
            fxCapBotCol.property(1).setValue(params.capBotColor);

            var fxEdgeCol = ctrl.property("ADBE Effect Parade").addProperty("ADBE Color Control");
            fxEdgeCol.name = "Edge Color";
            fxEdgeCol.property(1).setValue(params.edgeColor);

            var fxShading = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxShading.name = "Shading Intensity";
            fxShading.property(1).setValue(params.shading);

            // Screen Controls Group
            var fxFScreenEn = ctrl.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control");
            fxFScreenEn.name = "Front Screen Enabled";
            fxFScreenEn.property(1).setValue((params.screenMode === "top" || params.screenMode === "both" || params.screenMode === "both_sep") ? 1 : 0);

            var fxFScreenAlign = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxFScreenAlign.name = "Front Screen Alignment";
            fxFScreenAlign.property(1).setValue(params.screenAlign);

            var fxFScreenOff = ctrl.property("ADBE Effect Parade").addProperty("ADBE Point Control");
            fxFScreenOff.name = "Front Screen Offset";
            fxFScreenOff.property(1).setValue([params.screenOffsetX, params.screenOffsetY]);

            var fxFScreenScaleM = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxFScreenScaleM.name = "Front Screen Scale Mode";
            fxFScreenScaleM.property(1).setValue(params.screenScaleMode);

            var fxFScreenScale = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxFScreenScale.name = "Front Screen Scale";
            fxFScreenScale.property(1).setValue(params.screenScale);

            var fxFScreenOp = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxFScreenOp.name = "Front Screen Opacity";
            fxFScreenOp.property(1).setValue(100);

            // Back Screen Controls Group
            var fxBScreenEn = ctrl.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control");
            fxBScreenEn.name = "Back Screen Enabled";
            fxBScreenEn.property(1).setValue((params.screenMode === "bottom" || params.screenMode === "both" || params.screenMode === "both_sep") ? 1 : 0);

            var fxBScreenAlign = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxBScreenAlign.name = "Back Screen Alignment";
            fxBScreenAlign.property(1).setValue(params.screenAlign);

            var fxBScreenOff = ctrl.property("ADBE Effect Parade").addProperty("ADBE Point Control");
            fxBScreenOff.name = "Back Screen Offset";
            fxBScreenOff.property(1).setValue([params.screenOffsetX, params.screenOffsetY]);

            var fxBScreenScaleM = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxBScreenScaleM.name = "Back Screen Scale Mode";
            fxBScreenScaleM.property(1).setValue(params.screenScaleMode);

            var fxBScreenScale = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxBScreenScale.name = "Back Screen Scale";
            fxBScreenScale.property(1).setValue(params.screenScale);

            var fxBScreenOp = ctrl.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
            fxBScreenOp.name = "Back Screen Opacity";
            fxBScreenOp.property(1).setValue(100);

            // 2. Helper to build Cap Shape Layer
            function createCapShapeLayer(name, isTop) {
                var shapeLayer = targetComp.layers.addShape();
                shapeLayer.name = name;
                shapeLayer.threeDLayer = true;
                shapeLayer.parent = ctrl;
                shapeLayer.shy = false;

                // Set position expression
                shapeLayer.property("ADBE Transform Group").property("ADBE Position").expression =
                    isTop ? EXPRESSIONS.capTopPos : EXPRESSIONS.capBottomPos;

                if (!isTop) {
                    shapeLayer.property("ADBE Transform Group").property("ADBE Opacity").expression =
                        EXPRESSIONS.capBottomOpacity;
                }

                // Add Shape Group, Path, and Fill
                var contents = shapeLayer.property("ADBE Root Vectors Group");
                var shapeGroup = contents.addProperty("ADBE Vector Group");
                shapeGroup.name = "Cap Shape";
                var groupVectors = shapeGroup.property("ADBE Vectors Group");

                var pathProp = groupVectors.addProperty("ADBE Vector Shape - Group");
                pathProp.name = "Rounded Rect Path";
                pathProp.property("ADBE Vector Shape").expression = EXPRESSIONS.capPath;

                var fillProp = groupVectors.addProperty("ADBE Vector Graphic - Fill");
                fillProp.name = "Cap Fill";
                fillProp.property("ADBE Vector Fill Color").expression =
                    'thisComp.layer("Master Controller").effect("' + (isTop ? "Cap Top Color" : "Cap Bottom Color") + '")("Color");';

                return shapeLayer;
            }

            var capTop = createCapShapeLayer("Cap Top", true);
            var capBot = createCapShapeLayer("Cap Bottom", false);

            // 3. Helper to create Screen Layer with Alpha Matte
            function createScreenRig(isBack, sourceComp) {
                var prefix = isBack ? "Back" : "Front";

                // Matte layer (Shape layer copy of cap for clipping)
                var matte = targetComp.layers.addShape();
                matte.name = prefix + " Screen Matte";
                matte.threeDLayer = true;
                matte.parent = ctrl;
                matte.shy = params.shySecondary;

                matte.property("ADBE Transform Group").property("ADBE Position").expression =
                    isBack ? EXPRESSIONS.capBottomPos : EXPRESSIONS.capTopPos;

                var matteContents = matte.property("ADBE Root Vectors Group");
                var matteGroup = matteContents.addProperty("ADBE Vector Group");
                var matteGroupVectors = matteGroup.property("ADBE Vectors Group");
                var mattePath = matteGroupVectors.addProperty("ADBE Vector Shape - Group");
                mattePath.property("ADBE Vector Shape").expression = EXPRESSIONS.capPath;
                var matteFill = matteGroupVectors.addProperty("ADBE Vector Graphic - Fill");
                matteFill.property("ADBE Vector Fill Color").setValue([1, 1, 1, 1]);

                // Screen Comp Layer
                var screenLayer = targetComp.layers.add(sourceComp);
                screenLayer.name = prefix + " Screen [Screen Content]";
                screenLayer.threeDLayer = true;
                screenLayer.parent = ctrl;
                screenLayer.shy = false;

                // Expressions for Screen Comp
                screenLayer.property("ADBE Transform Group").property("ADBE Anchor Point").expression =
                    EXPRESSIONS.screenAnchor(isBack);
                screenLayer.property("ADBE Transform Group").property("ADBE Position").expression =
                    EXPRESSIONS.screenPos(isBack);
                screenLayer.property("ADBE Transform Group").property("ADBE Scale").expression =
                    EXPRESSIONS.screenScale(isBack);
                screenLayer.property("ADBE Transform Group").property("ADBE Opacity").expression =
                    EXPRESSIONS.screenOpacity(isBack);

                if (isBack) {
                    screenLayer.property("ADBE Transform Group").property("ADBE Rotate Y").setValue(180);
                }

                // Set Track Matte (Alpha Matte)
                // In AE CC 2023+ setTrackMatte, earlier versions use trackMatteType
                try {
                    if (screenLayer.setTrackMatte) {
                        screenLayer.setTrackMatte(matte, TrackMatteType.ALPHA);
                    } else {
                        matte.moveBefore(screenLayer);
                        screenLayer.trackMatteType = TrackMatteType.ALPHA;
                    }
                } catch (e) {
                    // Fallback for older legacy AE versions
                    try {
                        matte.moveBefore(screenLayer);
                        screenLayer.trackMatteType = TrackMatteType.ALPHA;
                    } catch (err) {}
                }

                return screenLayer;
            }

            // Create Screen Precomps if requested
            if (params.screenMode !== "none") {
                var screenFrontComp = null;
                var screenBackComp = null;

                // Function to create stylish sample placeholder screen precomp
                function createPlaceholderComp(title) {
                    var sComp = app.project.items.addComp(
                        title,
                        1920,
                        1080,
                        1.0,
                        comp.duration,
                        comp.frameRate
                    );
                    // Background solid
                    var bg = sComp.layers.addSolid([0.1, 0.12, 0.15], "Background", 1920, 1080, 1.0);
                    // Stylized grid or gradient graphic
                    var centerNull = sComp.layers.addNull();
                    centerNull.position.setValue([960, 540]);

                    var sampleText = sComp.layers.addText("REPLACE WITH YOUR CONTENT");
                    var textProp = sampleText.property("ADBE Text Properties").property("ADBE Text Document");
                    var textDoc = textProp.value;
                    textDoc.fontSize = 64;
                    textDoc.fillColor = [1, 1, 1];
                    textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
                    textProp.setValue(textDoc);
                    sampleText.position.setValue([960, 540]);

                    return sComp;
                }

                if (params.screenMode === "top" || params.screenMode === "both") {
                    screenFrontComp = createPlaceholderComp("[Screen] Front Cap Content");
                    createScreenRig(false, screenFrontComp);
                } else if (params.screenMode === "both_sep") {
                    screenFrontComp = createPlaceholderComp("[Screen] Front Cap Content");
                    createScreenRig(false, screenFrontComp);
                    screenBackComp = createPlaceholderComp("[Screen] Back Cap Content");
                    createScreenRig(true, screenBackComp);
                }

                if (params.screenMode === "bottom") {
                    screenBackComp = createPlaceholderComp("[Screen] Back Cap Content");
                    createScreenRig(true, screenBackComp);
                } else if (params.screenMode === "both" && screenFrontComp) {
                    createScreenRig(true, screenFrontComp);
                }
            }

            // 4. Create Straight Wall Segments
            function createStraightWall(name, sizeExp, posExp, rotX, rotY, rotZ) {
                var wall = targetComp.layers.addShape();
                wall.name = name;
                wall.threeDLayer = true;
                wall.parent = ctrl;
                wall.shy = params.shySecondary;

                var tr = wall.property("ADBE Transform Group");
                tr.property("ADBE Position").expression = posExp;
                tr.property("ADBE Rotate X").setValue(rotX);
                tr.property("ADBE Rotate Y").setValue(rotY);
                tr.property("ADBE Rotate Z").setValue(rotZ);
                tr.property("ADBE Opacity").expression = EXPRESSIONS.straightWallOpacity;

                var contents = wall.property("ADBE Root Vectors Group");
                var grp = contents.addProperty("ADBE Vector Group");
                var gVecs = grp.property("ADBE Vectors Group");

                var rect = gVecs.addProperty("ADBE Vector Shape - Rect");
                rect.property("ADBE Vector Rect Size").expression = sizeExp;

                var fill = gVecs.addProperty("ADBE Vector Graphic - Fill");
                fill.property("ADBE Vector Fill Color").expression =
                    'thisComp.layer("Master Controller").effect("Edge Color")("Color");';

                return wall;
            }

            createStraightWall("Wall Top", EXPRESSIONS.topWallSize, EXPRESSIONS.topWallPos, 90, 0, 0);
            createStraightWall("Wall Bottom", EXPRESSIONS.bottomWallSize, EXPRESSIONS.bottomWallPos, 90, 0, 180);
            createStraightWall("Wall Left", EXPRESSIONS.leftWallSize, EXPRESSIONS.leftWallPos, 90, 0, -90);
            createStraightWall("Wall Right", EXPRESSIONS.rightWallSize, EXPRESSIONS.rightWallPos, 90, 0, 90);

            // 5. Create Corner Arc Segments (Discretized into 2D strips)
            var segLimit = params.dynamicSegments ? 24 : params.segments;
            var corners = ["TL", "TR", "BR", "BL"];

            for (var c = 0; c < corners.length; c++) {
                var cName = corners[c];
                for (var k = 0; k < segLimit; k++) {
                    var segLayer = targetComp.layers.addShape();
                    segLayer.name = "Arc " + cName + " [" + (k + 1) + "]";
                    segLayer.threeDLayer = true;
                    segLayer.parent = ctrl;
                    segLayer.shy = params.shySecondary;

                    var tr = segLayer.property("ADBE Transform Group");
                    tr.property("ADBE Position").expression = EXPRESSIONS.cornerSegmentPos(cName, k);
                    tr.property("ADBE Rotate X").setValue(90);
                    tr.property("ADBE Rotate Y").setValue(0);
                    tr.property("ADBE Rotate Z").expression = EXPRESSIONS.cornerSegmentRotZ(cName, k);
                    tr.property("ADBE Opacity").expression = EXPRESSIONS.cornerSegmentOpacity(k);

                    var contents = segLayer.property("ADBE Root Vectors Group");
                    var grp = contents.addProperty("ADBE Vector Group");
                    var gVecs = grp.property("ADBE Vectors Group");

                    var rect = gVecs.addProperty("ADBE Vector Shape - Rect");
                    rect.property("ADBE Vector Rect Size").expression = EXPRESSIONS.cornerSegmentSize(cName);

                    var fill = gVecs.addProperty("ADBE Vector Graphic - Fill");
                    fill.property("ADBE Vector Fill Color").expression = EXPRESSIONS.cornerSegmentColor(cName, k);
                }
            }

            // Move Master Controller to top
            ctrl.moveToBeginning();
            targetComp.hideShyLayers = params.shySecondary;

        } catch (err) {
            alert("Error building rig: " + err.toString(), SCRIPT_NAME);
        } finally {
            app.endUndoGroup();
        }
    }

    // ScriptUI Interface Builder
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 8;
        win.margins = 10;

        // Title Header
        var titleGrp = win.add("group");
        titleGrp.orientation = "row";
        titleGrp.alignChildren = ["left", "center"];
        var titleTxt = titleGrp.add("statictext", undefined, SCRIPT_NAME);
        titleTxt.graphics.font = ScriptUI.newFont("sans-serif", "bold", 14);
        var verTxt = titleGrp.add("statictext", undefined, "v" + SCRIPT_VERSION);
        verTxt.graphics.foregroundColor = win.graphics.newPen(win.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5, 1], 1);

        // Tabbed Panel
        var tabPnl = win.add("tabbedpanel");
        tabPnl.alignChildren = ["fill", "fill"];

        // ---------------- TAB 1: GEOMETRY ----------------
        var tabGeom = tabPnl.add("tab", undefined, "Geometry");
        tabGeom.alignChildren = ["fill", "top"];
        tabGeom.spacing = 6;

        // Preset Selector
        var presetGrp = tabGeom.add("group");
        presetGrp.add("statictext", undefined, "Quick Preset:");
        var presetList = presetGrp.add("dropdownlist", undefined, [
            "Custom",
            "Smartphone Mockup (Phone Screen)",
            "Credit / ID Card",
            "Rounded 3D Tile",
            "UI Button Pill",
            "Sharp Corner Box"
        ]);
        presetList.selection = 0;

        // Dimensions Group
        var dimGrp = tabGeom.add("panel", undefined, "Dimensions (px)");
        dimGrp.alignChildren = ["fill", "top"];
        dimGrp.spacing = 4;

        var wGrp = dimGrp.add("group");
        wGrp.add("statictext", undefined, "Width:").characters = 8;
        var editWidth = wGrp.add("edittext", undefined, "600");
        editWidth.characters = 6;
        var slWidth = wGrp.add("slider", undefined, 600, 20, 3840);
        slWidth.onChanging = function () { editWidth.text = Math.round(this.value); };
        editWidth.onChange = function () { slWidth.value = parseFloat(this.text) || 600; };

        var hGrp = dimGrp.add("group");
        hGrp.add("statictext", undefined, "Height:").characters = 8;
        var editHeight = hGrp.add("edittext", undefined, "400");
        editHeight.characters = 6;
        var slHeight = hGrp.add("slider", undefined, 400, 20, 2160);
        slHeight.onChanging = function () { editHeight.text = Math.round(this.value); };
        editHeight.onChange = function () { slHeight.value = parseFloat(this.text) || 400; };

        // Corner Radii Group
        var radPnl = tabGeom.add("panel", undefined, "Corner Radii (px)");
        radPnl.alignChildren = ["fill", "top"];
        radPnl.spacing = 4;

        var linkCheck = radPnl.add("checkbox", undefined, "Link All 4 Corners");
        linkCheck.value = true;

        var rAllGrp = radPnl.add("group");
        rAllGrp.add("statictext", undefined, "Radius All:").characters = 10;
        var editRadAll = rAllGrp.add("edittext", undefined, "80");
        editRadAll.characters = 5;
        var slRadAll = rAllGrp.add("slider", undefined, 80, 0, 500);
        slRadAll.onChanging = function () { editRadAll.text = Math.round(this.value); };
        editRadAll.onChange = function () { slRadAll.value = parseFloat(this.text) || 80; };

        // Independent Radii Container
        var indepPnl = radPnl.add("group");
        indepPnl.orientation = "column";
        indepPnl.alignChildren = ["fill", "top"];
        indepPnl.visible = false;

        function addRadiusRow(label, defaultVal) {
            var g = indepPnl.add("group");
            g.add("statictext", undefined, label).characters = 10;
            var ed = g.add("edittext", undefined, defaultVal.toString());
            ed.characters = 5;
            var sl = g.add("slider", undefined, defaultVal, 0, 500);
            sl.onChanging = function () { ed.text = Math.round(this.value); };
            ed.onChange = function () { sl.value = parseFloat(this.text) || defaultVal; };
            return { edit: ed, slider: sl };
        }

        var rTL = addRadiusRow("Top-Left:", 80);
        var rTR = addRadiusRow("Top-Right:", 80);
        var rBR = addRadiusRow("Bottom-Right:", 80);
        var rBL = addRadiusRow("Bottom-Left:", 80);

        linkCheck.onClick = function () {
            rAllGrp.visible = this.value;
            indepPnl.visible = !this.value;
            win.layout.layout(true);
        };

        // ---------------- TAB 2: EXTRUSION & EDGES ----------------
        var tabExt = tabPnl.add("tab", undefined, "Extrusion");
        tabExt.alignChildren = ["fill", "top"];
        tabExt.spacing = 6;

        var extCheck = tabExt.add("checkbox", undefined, "Extrude (3D Pseudo-Mesh)");
        extCheck.value = true;

        var extPnl = tabExt.add("panel", undefined, "Extrusion Parameters");
        extPnl.alignChildren = ["fill", "top"];
        extPnl.spacing = 5;

        // Depth
        var depthGrp = extPnl.add("group");
        depthGrp.add("statictext", undefined, "Depth:").characters = 12;
        var editDepth = depthGrp.add("edittext", undefined, "60");
        editDepth.characters = 6;
        var slDepth = depthGrp.add("slider", undefined, 60, -500, 500);
        slDepth.onChanging = function () { editDepth.text = Math.round(this.value); };
        editDepth.onChange = function () { slDepth.value = parseFloat(this.text) || 60; };

        // Segments (6 - 24)
        var segGrp = extPnl.add("group");
        segGrp.add("statictext", undefined, "Arc Segments:").characters = 12;
        var editSeg = segGrp.add("edittext", undefined, "12");
        editSeg.characters = 6;
        var slSeg = segGrp.add("slider", undefined, 12, 6, 24);
        slSeg.onChanging = function () { editSeg.text = Math.round(this.value); };
        editSeg.onChange = function () {
            var val = Math.max(6, Math.min(24, Math.round(parseFloat(this.text) || 12)));
            this.text = val.toString();
            slSeg.value = val;
        };

        // Precision Seam Overlap
        var seamGrp = extPnl.add("group");
        seamGrp.add("statictext", undefined, "Seam Overlap:").characters = 12;
        var editSeam = seamGrp.add("edittext", undefined, "0.5");
        editSeam.characters = 6;
        seamGrp.add("statictext", undefined, "px (prevents hairline gaps)");

        // Cap Z-Offset
        var offGrp = extPnl.add("group");
        offGrp.add("statictext", undefined, "Cap Inset/Offset:").characters = 12;
        var editCapOff = offGrp.add("edittext", undefined, "0.1");
        editCapOff.characters = 6;
        offGrp.add("statictext", undefined, "px (prevents Z-fighting)");

        // Shading Intensity
        var shdGrp = extPnl.add("group");
        shdGrp.add("statictext", undefined, "Curved Shading:").characters = 12;
        var editShd = shdGrp.add("edittext", undefined, "15");
        editShd.characters = 6;
        var slShd = shdGrp.add("slider", undefined, 15, 0, 100);
        slShd.onChanging = function () { editShd.text = Math.round(this.value); };
        editShd.onChange = function () { slShd.value = parseFloat(this.text) || 15; };

        // ---------------- TAB 3: COLORS & STYLING ----------------
        var tabCol = tabPnl.add("tab", undefined, "Colors");
        tabCol.alignChildren = ["fill", "top"];
        tabCol.spacing = 6;

        var colPnl = tabCol.add("panel", undefined, "Color Settings");
        colPnl.alignChildren = ["fill", "top"];
        colPnl.spacing = 6;

        function addColorSelector(label, defaultHex) {
            var g = colPnl.add("group");
            g.add("statictext", undefined, label).characters = 14;
            var ed = g.add("edittext", undefined, defaultHex);
            ed.characters = 8;
            var colBtn = g.add("button", undefined, "Pick");
            colBtn.size = [50, 22];

            colBtn.onClick = function () {
                var currentRgba = hexToRgba(ed.text);
                var picked = ($.colorPicker) ? $.colorPicker(currentRgba) : null;
                if (picked !== null && picked !== -1) {
                    var hex = rgbaToHex([
                        ((picked >> 16) & 255) / 255,
                        ((picked >> 8) & 255) / 255,
                        (picked & 255) / 255
                    ]);
                    ed.text = hex;
                }
            };
            return ed;
        }

        var colTop = addColorSelector("Cap Top / Front:", "#1E88E5");
        var colBot = addColorSelector("Cap Bottom / Back:", "#0D47A1");
        var colEdge = addColorSelector("Edge Walls:", "#1565C0");

        // ---------------- TAB 4: SCREEN / COMP PLAYBACK ----------------
        var tabScreen = tabPnl.add("tab", undefined, "Cap Screen");
        tabScreen.alignChildren = ["fill", "top"];
        tabScreen.spacing = 6;

        var scModeGrp = tabScreen.add("group");
        scModeGrp.add("statictext", undefined, "Screen Mode:");
        var screenModeList = scModeGrp.add("dropdownlist", undefined, [
            "None",
            "Top / Front Cap Only",
            "Bottom / Back Cap Only",
            "Both Caps (Shared Comp)",
            "Both Caps (Separate Comps)"
        ]);
        screenModeList.selection = 0;

        var scPnl = tabScreen.add("panel", undefined, "Screen Placement & Scaling");
        scPnl.alignChildren = ["fill", "top"];
        scPnl.spacing = 5;

        // Alignment
        var alignGrp = scPnl.add("group");
        alignGrp.add("statictext", undefined, "Alignment:").characters = 12;
        var alignList = alignGrp.add("dropdownlist", undefined, [
            "Center",
            "Top-Left",
            "Top-Center",
            "Top-Right",
            "Center-Left",
            "Center-Right",
            "Bottom-Left",
            "Bottom-Center",
            "Bottom-Right"
        ]);
        alignList.selection = 0;

        // Scale Mode
        var scaleModeGrp = scPnl.add("group");
        scaleModeGrp.add("statictext", undefined, "Scale Mode:").characters = 12;
        var scaleModeList = scaleModeGrp.add("dropdownlist", undefined, [
            "Manual Scale (%)",
            "Auto Fit (Inside)",
            "Auto Fill (Cover)",
            "Stretch to Cap"
        ]);
        scaleModeList.selection = 1;

        // Manual Scale
        var manScaleGrp = scPnl.add("group");
        manScaleGrp.add("statictext", undefined, "Scale Adjust:").characters = 12;
        var editScreenScale = manScaleGrp.add("edittext", undefined, "100");
        editScreenScale.characters = 5;
        var slScreenScale = manScaleGrp.add("slider", undefined, 100, 10, 500);
        slScreenScale.onChanging = function () { editScreenScale.text = Math.round(this.value); };
        editScreenScale.onChange = function () { slScreenScale.value = parseFloat(this.text) || 100; };

        // Offsets
        var scOffGrp = scPnl.add("group");
        scOffGrp.add("statictext", undefined, "Offset (X, Y):").characters = 12;
        var editOffX = scOffGrp.add("edittext", undefined, "0");
        editOffX.characters = 4;
        scOffGrp.add("statictext", undefined, ",");
        var editOffY = scOffGrp.add("edittext", undefined, "0");
        editOffY.characters = 4;
        scOffGrp.add("statictext", undefined, "px");

        // ---------------- TAB 5: BUILD & RIG OPTIONS ----------------
        var tabBuild = tabPnl.add("tab", undefined, "Build Options");
        tabBuild.alignChildren = ["fill", "top"];
        tabBuild.spacing = 6;

        var targetGrp = tabBuild.add("group");
        targetGrp.add("statictext", undefined, "Build Destination:");
        var targetList = targetGrp.add("dropdownlist", undefined, [
            "Dedicated 3D Precomp (Clean & Self-Contained)",
            "Active Composition (Direct Layers)"
        ]);
        targetList.selection = 0;

        var dynSegCheck = tabBuild.add("checkbox", undefined, "Dynamic Segment Count (Animatable Timeline Slider 6-24)");
        dynSegCheck.value = true;

        var shyCheck = tabBuild.add("checkbox", undefined, "Shy Secondary Layers (Keep timeline organized)");
        shyCheck.value = true;

        // Preset Change Listener
        presetList.onChange = function () {
            switch (presetList.selection.index) {
                case 1: // Smartphone
                    editWidth.text = "450"; slWidth.value = 450;
                    editHeight.text = "920"; slHeight.value = 920;
                    linkCheck.value = true;
                    editRadAll.text = "75"; slRadAll.value = 75;
                    editDepth.text = "35"; slDepth.value = 35;
                    editSeg.text = "16"; slSeg.value = 16;
                    screenModeList.selection = 1;
                    scaleModeList.selection = 1;
                    colTop.text = "#101010"; colBot.text = "#252528"; colEdge.text = "#434346";
                    break;
                case 2: // Credit Card
                    editWidth.text = "856"; slWidth.value = 856;
                    editHeight.text = "540"; slHeight.value = 540;
                    linkCheck.value = true;
                    editRadAll.text = "32"; slRadAll.value = 32;
                    editDepth.text = "8"; slDepth.value = 8;
                    editSeg.text = "12"; slSeg.value = 12;
                    colTop.text = "#D4AF37"; colBot.text = "#B8860B"; colEdge.text = "#C5A028";
                    break;
                case 3: // 3D Tile
                    editWidth.text = "500"; slWidth.value = 500;
                    editHeight.text = "500"; slHeight.value = 500;
                    linkCheck.value = true;
                    editRadAll.text = "60"; slRadAll.value = 60;
                    editDepth.text = "80"; slDepth.value = 80;
                    editSeg.text = "12"; slSeg.value = 12;
                    colTop.text = "#00C853"; colBot.text = "#1B5E20"; colEdge.text = "#2E7D32";
                    break;
                case 4: // UI Button Pill
                    editWidth.text = "360"; slWidth.value = 360;
                    editHeight.text = "100"; slHeight.value = 100;
                    linkCheck.value = true;
                    editRadAll.text = "50"; slRadAll.value = 50;
                    editDepth.text = "25"; slDepth.value = 25;
                    editSeg.text = "16"; slSeg.value = 16;
                    colTop.text = "#FF6D00"; colBot.text = "#D50000"; colEdge.text = "#E65100";
                    break;
                case 5: // Sharp Corner Box
                    editWidth.text = "500"; slWidth.value = 500;
                    editHeight.text = "350"; slHeight.value = 350;
                    linkCheck.value = true;
                    editRadAll.text = "0"; slRadAll.value = 0;
                    editDepth.text = "120"; slDepth.value = 120;
                    editSeg.text = "6"; slSeg.value = 6;
                    colTop.text = "#673AB7"; colBot.text = "#311B92"; colEdge.text = "#512DA8";
                    break;
            }
            linkCheck.onClick();
        };

        // ---------------- ACTION BUTTONS ----------------
        var btnGrp = win.add("group");
        btnGrp.orientation = "row";
        btnGrp.alignChildren = ["fill", "center"];

        var buildBtn = btnGrp.add("button", undefined, "Build Extruded Round Corners");
        buildBtn.preferredSize.height = 36;
        buildBtn.graphics.font = ScriptUI.newFont("sans-serif", "bold", 12);

        buildBtn.onClick = function () {
            // Gather all parameters
            var screenModes = ["none", "top", "bottom", "both", "both_sep"];
            var params = {
                width: parseFloat(editWidth.text) || 600,
                height: parseFloat(editHeight.text) || 400,
                linkRadii: linkCheck.value,
                radiusAll: parseFloat(editRadAll.text) || 80,
                radiusTL: parseFloat(rTL.edit.text) || 80,
                radiusTR: parseFloat(rTR.edit.text) || 80,
                radiusBR: parseFloat(rBR.edit.text) || 80,
                radiusBL: parseFloat(rBL.edit.text) || 80,
                isExtruded: extCheck.value,
                depth: parseFloat(editDepth.text) || 60,
                segments: Math.max(6, Math.min(24, Math.round(parseFloat(editSeg.text) || 12))),
                seamOverlap: parseFloat(editSeam.text) || 0.5,
                capOffset: parseFloat(editCapOff.text) || 0.1,
                shading: parseFloat(editShd.text) || 15,
                capTopColor: hexToRgba(colTop.text),
                capBotColor: hexToRgba(colBot.text),
                edgeColor: hexToRgba(colEdge.text),
                screenMode: screenModes[screenModeList.selection.index],
                screenAlign: alignList.selection.index,
                screenScaleMode: scaleModeList.selection.index,
                screenScale: parseFloat(editScreenScale.text) || 100,
                screenOffsetX: parseFloat(editOffX.text) || 0,
                screenOffsetY: parseFloat(editOffY.text) || 0,
                targetMode: targetList.selection.index === 0 ? "precomp" : "active",
                dynamicSegments: dynSegCheck.value,
                shySecondary: shyCheck.value
            };

            buildExtrusionRig(params);
        };

        win.layout.layout(true);
        return win;
    }

    // Launch UI
    var myUI = buildUI(thisObj);
    if (myUI instanceof Window) {
        myUI.center();
        myUI.show();
    }

})(this);
