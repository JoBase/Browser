const $builtinmodule = () => {
    Sk.misceval.print_("Welcome to JoBase\n")

    const canvas = Sk.JoBase
    const module = {}
    const textures = []
    const fonts = []

    const gl = canvas.getContext("webgl")
    const program = gl.createProgram()
    const mesh = gl.createBuffer()

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)

    const str = e => new Sk.builtin.str(e)
    const def = e => new Sk.builtin.func(e)
    const float = e => new Sk.builtin.float_(e)
    const int = e => new Sk.builtin.int_(e)
    const bool = e => new Sk.builtin.bool(e)
    const tuple = e => new Sk.builtin.tuple(e)
    const dict = e => new Sk.builtin.dict(e)

    const number = e => {
        if (Sk.builtin.checkNumber(e)) return e.v
        throw new Sk.builtin.TypeError("must be real number, not " + e.tp$name)
    }

    const string = e => {
        if (Sk.builtin.checkString(e)) return e.v
        throw new Sk.builtin.TypeError("must be str, not " + e.tp$name)
    }

    const property = (...args) => call(Sk.builtin.property, ...args)
    const build = (...args) => Sk.misceval.buildClass(module, ...args)
    const call = (...args) => Sk.misceval.callsimOrSuspend(...args)
    const is = (...args) => Sk.builtin.isinstance(...args).v
    const wait = e => Sk.misceval.promiseToSuspension(new Promise(e))
    const promise = e => Sk.misceval.asyncToPromise(() => e)
    const file = e => new Sk.builtin.FileNotFoundError(e)
    const object = e => {throw new Sk.builtin.TypeError("must be Shape or cursor, not " + e.tp$name)}

    const path = file => str("https://jobase.org/Browser/JoBase/" + file)
    const width = () => canvas.width / devicePixelRatio
    const height = () => canvas.height / devicePixelRatio
    const x = () => module.cursor.$x - width() / 2
    const y = () => height() / 2 - module.cursor.$y
    const average = e => (e[0] + e[1]) / 2
    const blank = () => {}

    const getPolyLeft = poly => poly.reduce((a, b) => b[0] < a ? b[0] : a, poly[0][0])
    const getPolyTop = poly => poly.reduce((a, b) => b[1] > a ? b[1] : a, poly[0][1])
    const getPolyRight = poly => poly.reduce((a, b) => b[0] > a ? b[0] : a, poly[0][0])
    const getPolyBottom = poly => poly.reduce((a, b) => b[1] < a ? b[1] : a, poly[0][1])

    const getCenter = base => {
        const angle = base.$angle * Math.PI / 180
        
        return [
            base.$pos[0] + base.$anchor[0] * Math.cos(angle) - base.$anchor[1] * Math.sin(angle),
            base.$pos[1] + base.$anchor[1] * Math.cos(angle) + base.$anchor[0] * Math.sin(angle)
        ]
    }

    const mouseEnter = () => module.cursor.$enter = true
    const mouseLeave = () => module.cursor.$leave = true

    const mouseDown = () => {
        module.cursor.$press = true
        module.cursor.$hold = true
    }

    const mouseUp = () => {
        module.cursor.$release = true
        module.cursor.$hold = false
    }

    const mouseMove = event => {
        const rect = canvas.getBoundingClientRect()

        module.cursor.$x = event.clientX - rect.left
        module.cursor.$y = event.clientY - rect.top
        module.cursor.$move = true
    }

    const keyDown = event => {
        const name = Object.keys(module.key.$data).find(k => module.key.$data[k].code == event.code)
        const key = module.key.$data[name]

        if (event.repeat) {
            module.key.$repeat = true
            key && (key.repeat = true)
        }
        
        else {
            module.key.$press = true
            key && (key.press = true) && (key.hold = true)
        }
    }

    const keyUp = event => {
        const name = Object.keys(module.key.$data).find(k => module.key.$data[k].code == event.code)
        const key = module.key.$data[name]

        module.key.$release = true
        key && (key.release = true) && (key.hold = false)
    }

    const collideCircleCircle = (p1, r1, p2, r2) => {
        return Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) < r1 + r2
    }

    const collideCirclePoint = (pos, radius, point) => {
        return Math.hypot(point[0] - pos[0], point[1] - pos[1]) < radius
    }

    const collideLineLine = (p1, p2, p3, p4) => {
        const value = (p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]);
        const u1 = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / value
        const u2 = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / value
    
        return u1 >= 0 && u1 <= 1 && u2 >= 0 && u2 <= 1
    }

    const collideLinePoint = (p1, p2, point) => {
        const d1 = Math.hypot(point[0] - p1[0], point[1] - p1[1])
        const d2 = Math.hypot(point[0] - p2[0], point[1] - p2[1])
        const length = Math.hypot(p1[0] - p2[0], p1[1] - p2[1])
    
        return d1 + d2 >= length - .1 && d1 + d2 <= length + .1
    }

    const collideLineCircle = (p1, p2, pos, radius) => {
        if (collideCirclePoint(pos, radius, p1) || collideCirclePoint(pos, radius, p2))
            return true
    
        const length = Math.hypot(p1[0] - p2[0], p1[1] - p2[1])
        const dot = ((pos[0] - p1[0]) * (p2[0] - p1[0]) + (pos[1] - p1[1]) * (p2[1] - p1[1])) / length ** 2
        const point = [p1[0] + dot * (p2[0] - p1[0]), p1[1] + dot * (p2[1] - p1[1])]
    
        return collideLinePoint(p1, p2, point) ? Math.hypot(
            point[0] - pos[0], point[1] - pos[1]) <= radius : false
    }
    
    const collidePolyLine = (poly, p1, p2) => poly.find(
        (e, i, a) => collideLineLine(p1, p2, e, a[i + 1 == a.length ? 0 : i + 1]))

    const collidePolyPoly = (p1, p2) => collidePolyPoint(p1, p2[0]) || collidePolyPoint(p2, p1[0]) || p1.find(
        (e, i, a) => collidePolyLine(p2, e, a[i + 1 == a.length ? 0 : i + 1]))
    
    const collidePolyPoint = (poly, point) => poly.reduce((s, e, i, a) => {
        const v = a[i + 1 == a.length ? 0 : i + 1]

        return (point[0] < (v[0] - e[0]) * (point[1] - e[1]) / (v[1] - e[1]) + e[0]) &&
            ((e[1] > point[1] && v[1] < point[1]) ||
            (e[1] < point[1] && v[1] > point[1])) ? !s : s
    }, false)

    const collidePolyCircle = (poly, pos, radius) => poly.find(
        (e, i, a) => collideLineCircle(e, a[i + 1 == a.length ? 0 : i + 1], pos, radius))

    const rotPoly = (poly, angle, pos) => {
        const cos = Math.cos(angle * Math.PI / 180)
        const sin = Math.sin(angle * Math.PI / 180)

        return poly.map(e => [
            e[0] * cos - e[1] * sin + pos[0],
            e[0] * sin + e[1] * cos + pos[1]
        ])
    }

    const getRectPoly = rect => {
        const ax = rect.$anchor[0]
        const ay = rect.$anchor[1]
        const px = rect.$size[0] * rect.$scale[0] / 2
        const py = rect.$size[1] * rect.$scale[1] / 2

        const poly = [
            [ax - px, ay + py],
            [ax + px, ay + py],
            [ax + px, ay - py],
            [ax - px, ay - py]
        ]
    
        return rotPoly(poly, rect.$angle, rect.$pos)
    }

    const createImage = image => {
        const texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        
        return texture
    }

    const setUniform = (matrix, color) => {
        gl.uniform4fv(gl.getUniformLocation(program, "color"), new Float32Array(color))
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "object"), false, new Float32Array(matrix))
    }

    const setMatrix = (shape, width, height) => {
        const sx = width * shape.$scale[0]
        const sy = height * shape.$scale[1]
        const ax = shape.$anchor[0]
        const ay = shape.$anchor[1]
        const px = shape.$pos[0]
        const py = shape.$pos[1]
        const s = Math.sin(shape.$angle * Math.PI / 180)
        const c = Math.cos(shape.$angle * Math.PI / 180)
    
        setUniform([
            sx * c, sx * s, 0, 0,
            sy * -s, sy * c, 0, 0,
            0, 0, 1, 0,
            ax * c + ay * -s + px, ax * s + ay * c + py, 0, 1
        ], shape.$color)
    }

    const drawRect = (rect, type) => {
        setMatrix(rect, rect.$size[0], rect.$size[1])

        gl.bindBuffer(gl.ARRAY_BUFFER, mesh)
        gl.vertexAttribPointer(gl.getAttribLocation(program, "vertex"), 2, gl.FLOAT, false, 16, 0)
        gl.vertexAttribPointer(gl.getAttribLocation(program, "coordinate"), 2, gl.FLOAT, false, 16, 8)
        gl.enableVertexAttribArray(0)
        gl.enableVertexAttribArray(1)

        gl.uniform1i(gl.getUniformLocation(program, "image"), type)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        gl.disableVertexAttribArray(0)
        gl.disableVertexAttribArray(1)
    }

    const update = (other, set) => {
        if (other == module.cursor) set(x(), y())
        else if (is(other, shape.class)) set(...other.$pos)
        else object(other)
    }

    const moveToward = def((self, other, speed) => {
        const pixels = number(speed || int(1))
    
        update(other, (x, y) => {
            const a = x - self.$pos[0]
            const b = y - self.$pos[1]

            if (Math.hypot(a, b) < pixels) {
                self.$pos[0] += a
                self.$pos[1] += b
            }

            else {
                self.$pos[0] += Math.cos(Math.atan2(b, a)) * pixels
                self.$pos[1] += Math.sin(Math.atan2(b, a)) * pixels
            }
        })
    })

    const moveSmooth = def((self, other, speed) => {
        const pixels = number(speed || float(.1))
    
        update(other, (x, y) => {
            self.$pos[0] += (x - self.$pos[0]) * pixels;
            self.$pos[1] += (y - self.$pos[1]) * pixels;
        })
    })

    const collide = def((self, other) => {
        if (is(self, module.Rectangle)) {
            if (is(other, module.Rectangle))
                return bool(collidePolyPoly(getRectPoly(self), getRectPoly(other)))

            if (is(other, module.Circle))
                return bool(collidePolyCircle(
                    getRectPoly(self), getCenter(other),
                    other.$radius * average(other.$scale)))

            if (other == module.cursor)
                return bool(collidePolyPoint(getRectPoly(self), [x(), y()]))

            object(other)
        }

        if (is(self, module.Circle)) {
            if (is(other, module.Rectangle))
                return bool(collidePolyCircle(
                    getRectPoly(other), getCenter(self),
                    self.$radius * average(self.$scale)))

            if (is(other, module.Circle))
                return bool(collideCircleCircle(
                    getCenter(self), self.$radius * average(self.$scale),
                    getCenter(other), other.$radius * average(other.$scale)))

            if (other == module.cursor)
                return bool(collideCirclePoint(
                    getCenter(self), self.$radius * average(self.$scale),
                    [x(), y()]))

            object(other)
        }

        if (self == module.cursor) {
            if (is(other, module.Rectangle))
                return bool(collidePolyPoint(getRectPoly(other), [x(), y()]))

            if (is(other, module.Circle))
                return bool(collideCirclePoint(
                    getCenter(other), other.$radius * average(other.$scale),
                    [x(), y()]))

            if (other == module.cursor)
                return Sk.builtin.bool.true$

            object(other)
        }

        object(self)
    })

    const colors = {
        WHITE: [1, 1, 1],
        BLACK: [0, 0, 0],
        GRAY: [.5, .5, .5],
        BROWN: [.6, .2, .2],
        TAN: [.8, .7, .6],
        RED: [1, 0, 0],
        DARK_RED: [.6, 0, 0],
        SALMON: [1, .5, .5],
        ORANGE: [1, .5, 0],
        GOLD: [1, .8, 0],
        YELLOW: [1, 1, 0],
        OLIVE: [.5, .5, 0],
        LIME: [0, 1, 0],
        DARK_GREEN: [0, .4, 0],
        GREEN: [0, .5, 0],
        AQUA: [0, 1, 1],
        BLUE: [0, 0, 1],
        AZURE: [.9, 1, 1],
        NAVY: [0, 0, .5],
        PURPLE: [.5, 0, .5],
        PINK: [1, .75, .8],
        MAGENTA: [1, 0, 1]
    }

    const vector = {
        set: (value, array) => {
            if (value.ob$type == vector.class)
                array.forEach((e, i, a) => a[i] = i < value.$data.length ? value.$get()[i] : e)

            else if (Sk.builtin.checkSequence(value))
                array.forEach((e, i, a) => a[i] = i < value.v.length ? value.v[i].v : e)

            else throw new Sk.builtin.TypeError("attribute must be a sequence of values")
            return array
        },

        new: (parent, get, ...data) => {
            const value = call(vector.class)

            value.$parent = parent
            value.$get = get
            value.$data = data.map(e => ({name: e[0], set: e[1]}))

            return value
        },

        class: build((_globals, locals) => {
            const calc = (self, other, type) => {
                if (Sk.builtin.checkNumber(other))
                    return tuple(self.$get().map(e => float(eval(e + type + number(other)))))

                if (is(other, vector.class))                
                    return tuple(Array.from({
                        length: Math.max(self.$data.length, other.$data.length)
                    }).map((_e, i) => float(eval((self.$get()[i] || 0) + type + (other.$get()[i] || 0)))))

                throw new Sk.builtin.TypeError("must be Vector or number, not " + other.tp$name)
            }

            locals.__getattr__ = def((self, name) => {
                const index = self.$data.findIndex(e => e.name == name.v)
                if (index != -1) return float(self.$get()[index])
            })
    
            locals.__setattr__ = def((self, name, value) => {
                const item = self.$data.find(e => e.name == name.v)
                item && item.set(self.$parent, value)
            })

            locals.__add__ = def((self, other) => calc(self, other, "+"))
            locals.__sub__ = def((self, other) => calc(self, other, "-"))
            locals.__mul__ = def((self, other) => calc(self, other, "*"))
            locals.__truediv__ = def((self, other) => calc(self, other, "/"))

            locals.__getitem__ = def((self, index) => {
                if (index >= self.$get().length)
                    throw new Sk.builtin.IndexError("index out of range")

                return self.$get()[index]
            })
    
            locals.__len__ = def(s => int(s.$data.length))
            locals.__str__ = def(s => str(`(${s.$get().join(", ")})`))
            locals.__repr__ = def(s => str(`[${s.$get().join(", ")}]`))
        }, "Vector")
    }

    const shape = {
        new: (self, x, y, angle, color) => {
            self.$color = vector.set(color, [0, 0, 0, 1])
            self.$pos = [number(x), number(y)]
            self.$angle = number(angle)
            self.$anchor = [0, 0]
            self.$scale = [1, 1]
        },

        class: build((_globals, locals) => {
            locals.collides_with = collide
            locals.move_toward = moveToward

            locals.look_at = def((self, other) => update(other, (x, y) => {
                const angle = Math.atan2(y - self.$pos[1], x - self.$pos[0])
                self.$angle = angle * 180 / Math.PI
            }))

            const x = (self, value) => self.$pos[0] = number(value)
            const y = (self, value) => self.$pos[1] = number(value)

            locals.x = property(def(s => float(s.$pos[0])), def(x))
            locals.y = property(def(s => float(s.$pos[1])), def(y))

            locals.pos = locals.position = property(
                def(self => vector.new(self, () => self.$pos, ["x", x], ["y", y])),
                def((self, value) => vector.set(value, self.$pos)))

            locals.top = property(
                def(self => float(self.$top())),
                def((self, value) => self.$pos[1] += value - self.$top()))

            locals.left = property(
                def(self => float(self.$left())),
                def((self, value) => self.$pos[0] += value - self.$left()))

            locals.bottom = property(
                def(self => float(self.$bottom())),
                def((self, value) => self.$pos[1] += value - self.$bottom()))

            locals.right = property(
                def(self => float(self.$right())),
                def((self, value) => self.$pos[0] += value - self.$right()))

            const scaleX = (self, value) => self.$scale[0] = number(value)
            const scaleY = (self, value) => self.$scale[1] = number(value)

            locals.scale = property(
                def(self => vector.new(self, () => self.$scale, ["x", scaleX], ["y", scaleY])),
                def((self, value) => vector.set(value, self.$scale)))

            const anchorX = (self, value) => self.$anchor[0] = number(value)
            const anchorY = (self, value) => self.$anchor[1] = number(value)

            locals.anchor = property(
                def(self => vector.new(self, () => self.$anchor, ["x", anchorX], ["y", anchorY])),
                def((self, value) => vector.set(value, self.$anchor)))

            locals.angle = property(
                def(self => float(self.$angle)),
                def((self, value) => self.$angle = number(value)))

            const red = (self, value) => self.$color[0] = number(value)
            const green = (self, value) => self.$color[1] = number(value)
            const blue = (self, value) => self.$color[2] = number(value)
            const alpha = (self, value) => self.$color[3] = number(value)

            locals.red = property(def(s => float(s.$color[0])), def(red))
            locals.green = property(def(s => float(s.$color[1])), def(green))
            locals.blue = property(def(s => float(s.$color[2])), def(blue))
            locals.blue = property(def(s => float(s.$color[3])), def(alpha))

            locals.color = property(
                def(self => vector.new(self, () => self.$color, ["red", red], ["green", green], ["blue", blue], ["alpha", alpha])),
                def((self, value) => vector.set(value, self.$color)))
        }, "Shape")
    }

    module.MAN = path("images/man.png")
    module.COIN = path("images/coin.png")
    module.ENEMY = path("images/enemy.png")

    module.DEFAULT = path("fonts/default.ttf")
    module.CODE = path("fonts/code.ttf")
    module.PENCIL = path("fonts/pencil.ttf")
    module.SERIF = path("fonts/serif.ttf")
    module.HANDWRITING = path("fonts/handwriting.ttf")
    module.TYPEWRITER = path("fonts/typewriter.ttf")
    module.JOINED = path("fonts/joined.ttf")

    module.window = call(build((_globals, locals) => {
        const init = (self, caption, _width, _height, color) => {
            self.$caption = string(caption)
            self.$color = vector.set(color, [1, 1, 1])

            gl.clearColor(...self.$color, 1)
        }

        init.$defaults = [str("JoBase"), null, null, tuple()]
        init.co_varnames = ["self", "caption", "width", "height", "color"]
        locals.__init__ = def(init)

        locals.close = def(self => self.$close = true)
        locals.maximize = def(blank)
        locals.minimize = def(blank)
        locals.focus = def(blank)

        locals.caption = property(
            def(self => str(self.$caption)),
            def((self, value) => self.$caption = string(value)))

        const red = (self, value) => {
            self.$color[0] = number(value)
            gl.clearColor(...self.$color, 1)
        }
        
        const green = (self, value) => {
            self.$color[1] = number(value)
            gl.clearColor(...self.$color, 1)
        }

        const blue = (self, value) => {
            self.$color[2] = number(value)
            gl.clearColor(...self.$color, 1)
        }

        locals.red = property(def(s => float(s.$color[0])), def(red))
        locals.green = property(def(s => float(s.$color[1])), def(green))
        locals.blue = property(def(s => float(s.$color[2])), def(blue))

        locals.color = property(
            def(self => vector.new(self, () => self.$color, ["red", red], ["green", green], ["blue", blue])),
            def((self, value) => gl.clearColor(...vector.set(value, self.$color), 1)))
        
        locals.width = property(def(() => float(width())))
        locals.height = property(def(() => float(height())))

        locals.size = property(
            def(self => vector.new(self, () => [width(), height()], ["x", blank], ["y", blank])),
            def((_self, value) => vector.set(value, new Array(2))))

        locals.top = property(def(() => float(height() / 2)))
        locals.bottom = property(def(() => float(height() / -2)))
        locals.left = property(def(() => float(width() / -2)))
        locals.right = property(def(() => float(width() / 2)))
        locals.resize = property(def(self => bool(self.$resize)))
    }, "Window"))

    module.cursor = call(build((_globals, locals) => {
        locals.x = property(def(() => float(x())))
        locals.y = property(def(() => float(y())))

        locals.pos = locals.position = property(
            def(self => vector.new(self, () => [x(), y()], ["x", blank], ["y", blank])),
            def((_self, value) => vector.set(value, new Array(2))))

        locals.move = property(def(self => bool(self.$move)))
        locals.enter = property(def(self => bool(self.$enter)))
        locals.leave = property(def(self => bool(self.$leave)))
        locals.press = property(def(self => bool(self.$press)))
        locals.release = property(def(self => bool(self.$release)))
        locals.hold = property(def(self => bool(self.$hold)))
    }, "Cursor"))

    module.cursor.$x = 0
    module.cursor.$y = 0

    module.key = call(build((_globals, locals) => {
        locals.__getattr__ = def((self, name) => {
            const key = self.$data[name.v]

            if (key) return key.hold || key.release ? dict([
                str("press"), bool(key.press),
                str("release"), bool(key.release),
                str("repeat"), bool(key.repeat)
            ]) : Sk.builtin.bool.false$
        })

        locals.hold = property(def(self => {
            for (const key in self.$data)
                if (self.$data[key].hold)
                    return Sk.builtin.bool.true$

            return Sk.builtin.bool.false$
        }))

        locals.press = property(def(self => bool(self.$press)))
        locals.release = property(def(self => bool(self.$release)))
        locals.repeat = property(def(self => bool(self.$repeat)))
    }, "Key"))

    module.key.$data = {
        space: {code: "Space"},
        apostrophe: {code: "Quote"},
        comma: {code: "Comma"},
        minus: {code: "Minus"},
        period: {code: "Period"},
        slash: {code: "Slash"},
        _0: {code: "Digit0"},
        _1: {code: "Digit1"},
        _2: {code: "Digit2"},
        _3: {code: "Digit3"},
        _4: {code: "Digit4"},
        _5: {code: "Digit5"},
        _6: {code: "Digit6"},
        _7: {code: "Digit7"},
        _8: {code: "Digit8"},
        _9: {code: "Digit9"},
        semicolon: {code: "Semicolon"},
        equal: {code: "Equal"},
        a: {code: "KeyA"},
        b: {code: "KeyB"},
        c: {code: "KeyC"},
        d: {code: "KeyD"},
        e: {code: "KeyE"},
        f: {code: "KeyF"},
        g: {code: "KeyG"},
        h: {code: "KeyH"},
        i: {code: "KeyI"},
        j: {code: "KeyJ"},
        k: {code: "KeyK"},
        l: {code: "KeyL"},
        m: {code: "KeyM"},
        n: {code: "KeyN"},
        o: {code: "KeyO"},
        p: {code: "KeyP"},
        q: {code: "KeyQ"},
        r: {code: "KeyR"},
        s: {code: "KeyS"},
        t: {code: "KeyT"},
        u: {code: "KeyU"},
        v: {code: "KeyV"},
        w: {code: "KeyW"},
        x: {code: "KeyX"},
        y: {code: "KeyY"},
        z: {code: "KeyZ"},
        left_bracket: {code: "BracketLeft"},
        backslash: {code: "Backslash"},
        right_bracket: {code: "BracketRight"},
        backquote: {code: "Backquote"},
        escape: {code: "Escape"},
        enter: {code: "Enter"},
        tab: {code: "Tab"},
        backspace: {code: "Backspace"},
        insert: {code: "Insert"},
        delete: {code: "Delete"},
        right: {code: "ArrowRight"},
        left: {code: "ArrowLeft"},
        down: {code: "ArrowDown"},
        up: {code: "ArrowUp"},
        page_up: {code: "PageUp"},
        page_down: {code: "PageDown"},
        home: {code: "Home"},
        end: {code: "End"},
        caps_lock: {code: "CapsLock"},
        scroll_lock: {code: "ScrollLock"},
        num_lock: {code: "NumLock"},
        print_screen: {code: "PrintScreen"},
        pause: {code: "Pause"},
        f1: {code: "F1"},
        f2: {code: "F2"},
        f3: {code: "F3"},
        f4: {code: "F4"},
        f5: {code: "F5"},
        f6: {code: "F6"},
        f7: {code: "F7"},
        f8: {code: "F8"},
        f9: {code: "F9"},
        f10: {code: "F10"},
        f11: {code: "F11"},
        f12: {code: "F12"},
        f13: {code: "F13"},
        f14: {code: "F14"},
        f15: {code: "F15"},
        f16: {code: "F16"},
        f17: {code: "F17"},
        f18: {code: "F18"},
        f19: {code: "F19"},
        f20: {code: "F20"},
        f21: {code: "F21"},
        f22: {code: "F22"},
        f23: {code: "F23"},
        f24: {code: "F24"},
        f25: {code: "F25"},
        pad_0: {code: "Numpad0"},
        pad_1: {code: "Numpad1"},
        pad_2: {code: "Numpad2"},
        pad_3: {code: "Numpad3"},
        pad_4: {code: "Numpad4"},
        pad_5: {code: "Numpad5"},
        pad_6: {code: "Numpad6"},
        pad_7: {code: "Numpad7"},
        pad_8: {code: "Numpad8"},
        pad_9: {code: "Numpad9"},
        decimal: {code: "NumpadDecimal"},
        divide: {code: "NumpadDivide"},
        multiply: {code: "NumpadMultiply"},
        subtract: {code: "NumpadSubtract"},
        add: {code: "NumpadAdd"},
        enter: {code: "NumpadEnter"},
        equal: {code: "NumpadEqual"},
        left_shift: {code: "ShiftLeft"},
        left_ctrl: {code: "ControlLeft"},
        left_alt: {code: "AltLeft"},
        left_super: {code: "SuperLeft"},
        right_shift: {code: "ShiftRight"},
        right_ctrl: {code: "ControlRight"},
        right_alt: {code: "AltRight"},
        right_super: {code: "SuperRight"},
        menu: {code: "Menu"}
    }

    module.camera = call(build((_globals, locals) => {
        const init = (self, x, y) => {self.$pos = [number(x), number(y)]}

        init.$defaults = [int(), int()]
        init.co_varnames = ["self", "x", "y"]

        locals.__init__ = def(init)
        locals.move_toward = moveToward
        locals.move_toward_smooth = moveSmooth

        const x = (self, value) => self.$pos[0] = number(value)
        const y = (self, value) => self.$pos[1] = number(value)

        locals.x = property(def(s => float(s.$pos[0])), def(x))
        locals.y = property(def(s => float(s.$pos[1])), def(y))

        locals.pos = locals.position = property(
            def(self => vector.new(self, () => self.$pos, ["x", x], ["y", y])),
            def((self, value) => vector.set(value, self.$pos)))
    }, "Camera"))

    module.Rectangle = build((_globals, locals) => {
        const init = (self, x, y, width, height, angle, color) => {
            shape.new(self, x, y, angle, color)

            self.$size = [number(width), number(height)]
            self.$top = () => getPolyTop(getRectPoly(self))
            self.$left = () => getPolyLeft(getRectPoly(self))
            self.$bottom = () => getPolyBottom(getRectPoly(self))
            self.$right = () => getPolyRight(getRectPoly(self))
        }

        init.$defaults = [int(), int(), int(50), int(50), int(), tuple()]
        init.co_varnames = ["self", "x", "y", "width", "height", "angle", "color"]

        locals.__init__ = def(init)
        locals.draw = def(drawRect)

        const width = (self, value) => self.$size[0] = number(value)
        const height = (self, value) => self.$size[1] = number(value)

        locals.width = property(def(s => float(s.$size[0])), def(width))
        locals.height = property(def(s => float(s.$size[1])), def(height))

        locals.size = property(
            def(self => vector.new(self, () => self.$size, ["width", width], ["height", height])),
            def((self, value) => vector.set(value, self.$size)))
    }, "Rectangle", [shape.class])

    module.Image = build((_globals, locals) => {
        const init = (self, name, x, y, angle, width, height, color) => wait((resolve, reject) => {
            call(module.Rectangle.prototype.__init__, self, x, y, width, height, angle)
            const texture = textures.find(e => e.name == string(name))

            const set = image => {
                self.$texture = image.source
                self.$size[0] ||= image.width
                self.$size[1] ||= image.height
            }

            self.$color = vector.set(color, [1, 1, 1, 1])
            if (texture) return set(texture), resolve()

            const image = new Image()
            image.crossOrigin = "anonymous"
            image.src = string(name)

            image.onerror = () => reject(new Sk.builtin.FileNotFoundError(
                `failed to load image: "${string(name)}"`))

            image.onload = () => {
                const texture = {
                    name: string(name),
                    width: image.width,
                    height: image.height,
                    source: createImage(image)
                }

                textures.push(texture)
                set(texture)
                resolve()
            }
        })

        init.$defaults = [module.MAN, int(), int(), int(), int(), int(), tuple()]
        init.co_varnames = ["self", "name", "x", "y", "angle", "width", "height", "color"]
        locals.__init__ = def(init)

        locals.draw = def(self => {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, self.$texture)
            drawRect(self, true)
        })
    }, "Image", [module.Rectangle])

    module.Text = build((_globals, locals) => {
        const render = self => {
            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")
            const name = self.$fontSize * devicePixelRatio + "px _" + fonts.indexOf(self.$font)
            context.font = name
    
            const size = context.measureText(self.$content)
            const width = size.actualBoundingBoxRight - size.actualBoundingBoxLeft
    
            const metrics = context.measureText("Sy")
            const height = metrics.actualBoundingBoxDescent + metrics.actualBoundingBoxAscent
    
            canvas.width = width
            canvas.height = height
    
            self.$size[0] = width / devicePixelRatio
            self.$size[1] = height / devicePixelRatio
    
            context.font = name
            context.fillStyle = "#fff"
            context.fillText(self.$content, 0, metrics.actualBoundingBoxAscent)
    
            gl.deleteTexture(self.$texture)
            self.$texture = createImage(canvas)
        }
    
        const load = font => new Promise((resolve, reject) => {
            if (fonts.includes(font))
                return resolve()
            
            new FontFace("_" + fonts.length, `url(${font})`).load().then(face => {
                document.fonts.add(face)
                fonts.push(font)
                resolve()
            }).catch(() => reject(file(`failed to load font: "${font}"`)))
        })

        const init = (self, content, x, y, fontSize, angle, color, font) => wait((resolve, reject) => {
            call(module.Rectangle.prototype.__init__, self, x, y, int(), int(), angle, color)

            self.$font = string(font)
            self.$fontSize = number(fontSize)
            self.$content = string(content)

            load(self.$font).then(() => {
                render(self)
                resolve()
            }).catch(reject)
        })

        init.$defaults = [str("Text"), int(), int(), int(50), int(), tuple(), module.DEFAULT]
        init.co_varnames = ["self", "content", "x", "y", "font_size", "angle", "color", "font"]
        locals.__init__ = def(init)

        locals.draw = def(self => {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, self.$texture)
            drawRect(self, true)
        })

        locals.content = property(
            def(self => str(self.$content)),
            def((self, value) => {
                self.$content = string(value)
                render(self)
            }))

        locals.font = property(
            def(self => str(self.$font)),
            def((self, value) => wait((resolve, reject) => {
                load(self.$font = string(value)).then(() => {
                    render(self)
                    resolve()
                }).catch(reject)
            })))

        locals.font_size = property(
            def(self => float(self.$fontSize)),
            def((self, value) => {
                self.$fontSize = number(value)
                render(self)
            }))
    }, "Text", [module.Rectangle])

    module.Circle = build((_globals, locals) => {
        const vertices = self => ~~(Math.sqrt(Math.abs(self.$radius * average(self.$scale))) * 4) + 4

        const data = self => {
            const number = vertices(self) - 2
            const data = [0, 0]

            for (let i = 0; i <= number; i ++) {
                const angle = Math.PI * 2 * i / number

                data[i * 2 + 2] = Math.cos(angle) / 2
                data[i * 2 + 3] = Math.sin(angle) / 2
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, self.$vbo)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW)
        }

        const init = (self, x, y, diameter, color) => {
            shape.new(self, x, y, int(), color)

            self.$top = () => getCenter(self)[1] + self.$radius * self.$scale[1]
            self.$left = () => getCenter(self)[0] - self.$radius * self.$scale[0]
            self.$bottom = () => getCenter(self)[1] - self.$radius * self.$scale[1]
            self.$right = () => getCenter(self)[0] + self.$radius * self.$scale[0]

            self.$radius = diameter / 2
            self.$vbo = gl.createBuffer()
            data(self)
        }

        init.$defaults = [int(), int(), int(50), tuple()]
        init.co_varnames = ["self", "x", "y", "diameter", "color"]
        locals.__init__ = def(init)

        locals.draw = def(self => {
            setMatrix(self, self.$radius * 2, self.$radius * 2)

            gl.bindBuffer(gl.ARRAY_BUFFER, self.$vbo)
            gl.vertexAttribPointer(gl.getAttribLocation(program, "vertex"), 2, gl.FLOAT, false, 0, 0)
            gl.enableVertexAttribArray(0)

            gl.uniform1i(gl.getUniformLocation(program, "image"), false)
            gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices(self))
            gl.disableVertexAttribArray(0)
        })

        const scaleX = (self, value) => {
            self.$scale[0] = number(value)
            data(self)
        }

        const scaleY = (self, value) => {
            self.$scale[1] = number(value)
            data(self)
        }

        locals.scale = property(
            def(self => vector.new(self, () => self.$scale, ["x", scaleX], ["y", scaleY])),
            def((self, value) => vector.set(value, self.$scale) && data(self)))
    }, "Circle", [shape.class])

    module.random = def((a, b) => {
        const min = Math.min(number(a), number(b))
        return float(Math.random() * (Math.max(number(a), number(b)) - min) + min)
    })

    module.run = def(() => wait((resolve, reject) => {
        const update = async () => {
            const final = error => {
                gl.deleteBuffer(mesh)
                gl.deleteProgram(program)

                textures.forEach(e => gl.deleteTexture(e.source))
                size.disconnect()

                canvas.removeEventListener("mouseenter", mouseEnter)
                canvas.removeEventListener("mouseleave", mouseLeave)
                canvas.removeEventListener("mousedown", mouseDown)
                canvas.removeEventListener("mouseup", mouseUp)
                canvas.removeEventListener("mousemove", mouseMove)
                canvas.removeEventListener("keydown", keyDown)
                canvas.removeEventListener("keyup", keyUp)
    
                cancelAnimationFrame(process.frame)
                error ? reject(error) : resolve()
            }

            if (module.window.$close || Date.now() - Sk.execStart > Sk.execLimit)
                return final()

            const px = module.camera.$pos[0];
            const py = module.camera.$pos[1];
        
            const matrix = new Float32Array([
                2 / width(), 0, 0, 0,
                0, 2 / height(), 0, 0,
                0, 0, -2, 0,
                -px * 2 / width(), -py * 2 / height(), -1, 1
            ])

            gl.uniformMatrix4fv(gl.getUniformLocation(program, "camera"), false, matrix)
            gl.clear(gl.COLOR_BUFFER_BIT)

            if (process.main.$d.loop)
                try {await promise(call(process.main.$d.loop))}
                catch (e) {final(e)}

            module.window.$resize = false
            module.cursor.$move = false
            module.cursor.$enter = false
            module.cursor.$leave = false
            module.cursor.$press = false
            module.cursor.$release = false
            module.key.$press = false
            module.key.$release = false
            module.key.$repeat = false

            for (const key in module.key.$data) {
                module.key.$data[key].press = false
                module.key.$data[key].release = false
                module.key.$data[key].repeat = false
            }
        }

        const loop = () => {
            process.frame = requestAnimationFrame(loop)
            update()
        }

        const process = {
            main: Sk.importModule("__main__", false, true),
            frame: requestAnimationFrame(loop)
        }

        const size = new MutationObserver(() => {
            gl.viewport(0, 0, canvas.width, canvas.height)
            module.window.$resize = true

            update()
        })

        size.observe(canvas, {attributes: true})
    }))

    for (const name in colors)
        module[name] = tuple(colors[name].map(e => float(e)))

    canvas.addEventListener("mouseenter", mouseEnter)
    canvas.addEventListener("mouseleave", mouseLeave)
    canvas.addEventListener("mousedown", mouseDown)
    canvas.addEventListener("mouseup", mouseUp)
    canvas.addEventListener("mousemove", mouseMove)
    canvas.addEventListener("keydown", keyDown)
    canvas.addEventListener("keyup", keyUp)

    canvas.tabIndex = 0
    canvas.focus()

    gl.shaderSource(vertexShader, `
        attribute vec2 vertex;
        attribute vec2 coordinate;
        varying vec2 position;
        
        uniform mat4 camera;
        uniform mat4 object;
        
        void main(void) {
            gl_Position = camera * object * vec4(vertex, 0, 1);
            position = coordinate;
        }`)

    gl.shaderSource(fragmentShader, `
        precision mediump float;
        varying vec2 position;

        uniform vec4 color;
        uniform sampler2D sampler;
        uniform int image;

        void main(void) {
            if (image == 1) gl_FragColor = texture2D(sampler, position) * color;
            else gl_FragColor = color;
        }`)
    
    gl.compileShader(vertexShader)
    gl.compileShader(fragmentShader)
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    
    gl.linkProgram(program)
    gl.useProgram(program)
    gl.uniform1i(gl.getUniformLocation(program, "sampler"), 0)

    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -.5, .5, 0, 0,
        .5, .5, 1, 0,
        -.5, -.5, 0, 1,
        .5, -.5, 1, 1
    ]), gl.STATIC_DRAW)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

    return module
}