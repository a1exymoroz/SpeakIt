
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.20.1 */

    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[35] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	return child_ctx;
    }

    // (134:0) {#if isResultOpen}
    function create_if_block_2(ctx) {
    	let div3;
    	let div0;
    	let h30;
    	let t1;
    	let t2;
    	let ul0;
    	let t3;
    	let div1;
    	let h31;
    	let t5;
    	let t6;
    	let ul1;
    	let t7;
    	let div2;
    	let button0;
    	let t9;
    	let button1;
    	let dispose;
    	let if_block0 = !/*correctAnswers*/ ctx[7].length && create_if_block_4(ctx);
    	let each_value_3 = /*correctAnswers*/ ctx[7];
    	validate_each_argument(each_value_3);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_1[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let if_block1 = !/*wrongAnswers*/ ctx[8].length && create_if_block_3(ctx);
    	let each_value_2 = /*wrongAnswers*/ ctx[8];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "✅ Correct";
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			ul0 = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "❌ Wrong";
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "Return";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "New game";
    			attr_dev(h30, "class", "svelte-1grd79w");
    			add_location(h30, file, 136, 4, 3583);
    			attr_dev(ul0, "class", "svelte-1grd79w");
    			add_location(ul0, file, 140, 4, 3672);
    			attr_dev(div0, "class", "result__blocks svelte-1grd79w");
    			add_location(div0, file, 135, 2, 3550);
    			attr_dev(h31, "class", "svelte-1grd79w");
    			add_location(h31, file, 162, 4, 4324);
    			attr_dev(ul1, "class", "svelte-1grd79w");
    			add_location(ul1, file, 166, 4, 4410);
    			attr_dev(div1, "class", "result__blocks svelte-1grd79w");
    			add_location(div1, file, 161, 2, 4291);
    			attr_dev(button0, "class", "myButton svelte-1grd79w");
    			add_location(button0, file, 188, 4, 5027);
    			attr_dev(button1, "class", "myButton svelte-1grd79w");
    			add_location(button1, file, 189, 4, 5107);
    			add_location(div2, file, 187, 2, 5017);
    			attr_dev(div3, "class", "result__wrapper svelte-1grd79w");
    			add_location(div3, file, 134, 0, 3518);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t1);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t2);
    			append_dev(div0, ul0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul0, null);
    			}

    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t5);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t6);
    			append_dev(div1, ul1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul1, null);
    			}

    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t9);
    			append_dev(div2, button1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*click_handler*/ ctx[26], false, false, false),
    				listen_dev(button1, "click", /*click_handler_1*/ ctx[27], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (!/*correctAnswers*/ ctx[7].length) {
    				if (!if_block0) {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div0, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*onClickWord, correctAnswers, getTranslate*/ 3200) {
    				each_value_3 = /*correctAnswers*/ ctx[7];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_3(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(ul0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_3.length;
    			}

    			if (!/*wrongAnswers*/ ctx[8].length) {
    				if (!if_block1) {
    					if_block1 = create_if_block_3(ctx);
    					if_block1.c();
    					if_block1.m(div1, t6);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*onClickWord, wrongAnswers, getTranslate*/ 3328) {
    				each_value_2 = /*wrongAnswers*/ ctx[8];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks_1, detaching);
    			if (if_block1) if_block1.d();
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(134:0) {#if isResultOpen}",
    		ctx
    	});

    	return block;
    }

    // (138:4) {#if !correctAnswers.length}
    function create_if_block_4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Empty";
    			attr_dev(p, "class", "svelte-1grd79w");
    			add_location(p, file, 138, 4, 3645);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(138:4) {#if !correctAnswers.length}",
    		ctx
    	});

    	return block;
    }

    // (153:8) {:catch error}
    function create_catch_block_1(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*error*/ ctx[39].message + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("Something went wrong: ");
    			t1 = text(t1_value);
    			add_location(span, file, 154, 8, 4175);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*correctAnswers*/ 128 && t1_value !== (t1_value = /*error*/ ctx[39].message + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(153:8) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (150:8) {:then value}
    function create_then_block_1(ctx) {
    	let span;
    	let t_value = /*value*/ ctx[38] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file, 151, 8, 4085);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*correctAnswers*/ 128 && t_value !== (t_value = /*value*/ ctx[38] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(150:8) {:then value}",
    		ctx
    	});

    	return block;
    }

    // (147:49)          <!-- promise is pending -->         <span>waiting...</span>         {:then value}
    function create_pending_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "waiting...";
    			add_location(span, file, 148, 8, 3992);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(147:49)          <!-- promise is pending -->         <span>waiting...</span>         {:then value}",
    		ctx
    	});

    	return block;
    }

    // (142:6) {#each correctAnswers as correctAnswer}
    function create_each_block_3(ctx) {
    	let li;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = /*correctAnswer*/ ctx[40].word + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*correctAnswer*/ ctx[40].transcription + "";
    	let t4;
    	let t5;
    	let promise;
    	let t6;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block_1,
    		value: 38,
    		error: 39
    	};

    	handle_promise(promise = /*getTranslate*/ ctx[10](/*correctAnswer*/ ctx[40].word), info);

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			span0.textContent = "🔊";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			info.block.c();
    			t6 = space();
    			add_location(span0, file, 143, 8, 3782);
    			add_location(span1, file, 144, 8, 3813);
    			add_location(span2, file, 145, 8, 3855);
    			attr_dev(li, "class", "svelte-1grd79w");
    			add_location(li, file, 142, 6, 3729);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(li, t1);
    			append_dev(li, span1);
    			append_dev(span1, t2);
    			append_dev(li, t3);
    			append_dev(li, span2);
    			append_dev(span2, t4);
    			append_dev(li, t5);
    			info.block.m(li, info.anchor = null);
    			info.mount = () => li;
    			info.anchor = t6;
    			append_dev(li, t6);
    			if (remount) dispose();

    			dispose = listen_dev(
    				li,
    				"click",
    				function () {
    					if (is_function(/*onClickWord*/ ctx[11](/*correctAnswer*/ ctx[40]))) /*onClickWord*/ ctx[11](/*correctAnswer*/ ctx[40]).apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*correctAnswers*/ 128 && t2_value !== (t2_value = /*correctAnswer*/ ctx[40].word + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*correctAnswers*/ 128 && t4_value !== (t4_value = /*correctAnswer*/ ctx[40].transcription + "")) set_data_dev(t4, t4_value);
    			info.ctx = ctx;

    			if (dirty[0] & /*correctAnswers*/ 128 && promise !== (promise = /*getTranslate*/ ctx[10](/*correctAnswer*/ ctx[40].word)) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[38] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			info.block.d();
    			info.token = null;
    			info = null;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(142:6) {#each correctAnswers as correctAnswer}",
    		ctx
    	});

    	return block;
    }

    // (164:4) {#if !wrongAnswers.length}
    function create_if_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Empty";
    			attr_dev(p, "class", "svelte-1grd79w");
    			add_location(p, file, 164, 4, 4383);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(164:4) {#if !wrongAnswers.length}",
    		ctx
    	});

    	return block;
    }

    // (179:8) {:catch error}
    function create_catch_block(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*error*/ ctx[39].message + "";
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("Something went wrong: ");
    			t1 = text(t1_value);
    			add_location(span, file, 180, 8, 4901);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*wrongAnswers*/ 256 && t1_value !== (t1_value = /*error*/ ctx[39].message + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(179:8) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (176:8) {:then value}
    function create_then_block(ctx) {
    	let span;
    	let t_value = /*value*/ ctx[38] + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file, 177, 8, 4811);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*wrongAnswers*/ 256 && t_value !== (t_value = /*value*/ ctx[38] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(176:8) {:then value}",
    		ctx
    	});

    	return block;
    }

    // (173:47)          <!-- promise is pending -->         <span>waiting...</span>         {:then value}
    function create_pending_block(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "waiting...";
    			add_location(span, file, 174, 8, 4718);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(173:47)          <!-- promise is pending -->         <span>waiting...</span>         {:then value}",
    		ctx
    	});

    	return block;
    }

    // (168:6) {#each wrongAnswers as wrongAnswer}
    function create_each_block_2(ctx) {
    	let li;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = /*wrongAnswer*/ ctx[35].word + "";
    	let t2;
    	let t3;
    	let span2;
    	let t4_value = /*wrongAnswer*/ ctx[35].transcription + "";
    	let t4;
    	let t5;
    	let promise;
    	let t6;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 38,
    		error: 39
    	};

    	handle_promise(promise = /*getTranslate*/ ctx[10](/*wrongAnswer*/ ctx[35].word), info);

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			span0.textContent = "🔊";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span2 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			info.block.c();
    			t6 = space();
    			add_location(span0, file, 169, 8, 4514);
    			add_location(span1, file, 170, 8, 4545);
    			add_location(span2, file, 171, 8, 4585);
    			attr_dev(li, "class", "svelte-1grd79w");
    			add_location(li, file, 168, 6, 4463);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(li, t1);
    			append_dev(li, span1);
    			append_dev(span1, t2);
    			append_dev(li, t3);
    			append_dev(li, span2);
    			append_dev(span2, t4);
    			append_dev(li, t5);
    			info.block.m(li, info.anchor = null);
    			info.mount = () => li;
    			info.anchor = t6;
    			append_dev(li, t6);
    			if (remount) dispose();

    			dispose = listen_dev(
    				li,
    				"click",
    				function () {
    					if (is_function(/*onClickWord*/ ctx[11](/*wrongAnswer*/ ctx[35]))) /*onClickWord*/ ctx[11](/*wrongAnswer*/ ctx[35]).apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*wrongAnswers*/ 256 && t2_value !== (t2_value = /*wrongAnswer*/ ctx[35].word + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*wrongAnswers*/ 256 && t4_value !== (t4_value = /*wrongAnswer*/ ctx[35].transcription + "")) set_data_dev(t4, t4_value);
    			info.ctx = ctx;

    			if (dirty[0] & /*wrongAnswers*/ 256 && promise !== (promise = /*getTranslate*/ ctx[10](/*wrongAnswer*/ ctx[35].word)) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[38] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			info.block.d();
    			info.token = null;
    			info = null;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(168:6) {#each wrongAnswers as wrongAnswer}",
    		ctx
    	});

    	return block;
    }

    // (197:4) {#each pageRequestNumbers as pageRequestNumber}
    function create_each_block_1(ctx) {
    	let label;
    	let input;
    	let input_id_value;
    	let input_checked_value;
    	let t0;
    	let svg;
    	let circle;
    	let path0;
    	let path1;
    	let t1;
    	let span;
    	let t2_value = /*pageRequestNumber*/ ctx[32] + "";
    	let t2;
    	let t3;
    	let t4;
    	let label_for_value;
    	let dispose;

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[28](/*pageRequestNumber*/ ctx[32], ...args);
    	}

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			svg = svg_element("svg");
    			circle = svg_element("circle");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			t1 = space();
    			span = element("span");
    			t2 = text(t2_value);
    			t3 = text(" level");
    			t4 = space();
    			attr_dev(input, "type", "radio");
    			attr_dev(input, "id", input_id_value = "rdo-" + /*pageRequestNumber*/ ctx[32]);
    			attr_dev(input, "name", "radio-grp");
    			input.checked = input_checked_value = /*pageRequestNumber*/ ctx[32] === /*pageRequest*/ ctx[6];
    			attr_dev(input, "class", "svelte-1grd79w");
    			add_location(input, file, 198, 6, 5362);
    			attr_dev(circle, "cx", "10");
    			attr_dev(circle, "cy", "10");
    			attr_dev(circle, "r", "9");
    			attr_dev(circle, "class", "svelte-1grd79w");
    			add_location(circle, file, 206, 8, 5653);
    			attr_dev(path0, "d", "M10,7 C8.34314575,7 7,8.34314575 7,10 C7,11.6568542 8.34314575,13 10,13 C11.6568542,13 13,11.6568542 13,10 C13,8.34314575 11.6568542,7 10,7 Z");
    			attr_dev(path0, "class", "inner svelte-1grd79w");
    			add_location(path0, file, 207, 8, 5701);
    			attr_dev(path1, "d", "M10,1 L10,1 L10,1 C14.9705627,1 19,5.02943725 19,10 L19,10 L19,10 C19,14.9705627 14.9705627,19 10,19 L10,19 L10,19 C5.02943725,19 1,14.9705627 1,10 L1,10 L1,10 C1,5.02943725 5.02943725,1 10,1 L10,1 Z");
    			attr_dev(path1, "class", "outer svelte-1grd79w");
    			add_location(path1, file, 211, 8, 5912);
    			attr_dev(svg, "width", "20px");
    			attr_dev(svg, "height", "20px");
    			attr_dev(svg, "viewBox", "0 0 20 20");
    			attr_dev(svg, "class", "svelte-1grd79w");
    			add_location(svg, file, 205, 6, 5592);
    			attr_dev(span, "class", "svelte-1grd79w");
    			add_location(span, file, 216, 6, 6192);
    			attr_dev(label, "for", label_for_value = "rdo-" + /*pageRequestNumber*/ ctx[32]);
    			attr_dev(label, "class", "btn-radio svelte-1grd79w");
    			add_location(label, file, 197, 4, 5295);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			append_dev(label, t0);
    			append_dev(label, svg);
    			append_dev(svg, circle);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(label, t1);
    			append_dev(label, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(label, t4);
    			if (remount) dispose();
    			dispose = listen_dev(input, "click", click_handler_2, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*pageRequest*/ 64 && input_checked_value !== (input_checked_value = /*pageRequestNumber*/ ctx[32] === /*pageRequest*/ ctx[6])) {
    				prop_dev(input, "checked", input_checked_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(197:4) {#each pageRequestNumbers as pageRequestNumber}",
    		ctx
    	});

    	return block;
    }

    // (226:6) {#if wordTranslate && !isRecognizing}
    function create_if_block_1(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*wordTranslate*/ ctx[2]);
    			add_location(span, file, 226, 6, 6438);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*wordTranslate*/ 4) set_data_dev(t, /*wordTranslate*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(226:6) {#if wordTranslate && !isRecognizing}",
    		ctx
    	});

    	return block;
    }

    // (228:12) {#if isRecognizing}
    function create_if_block(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(/*speakResult*/ ctx[3]);
    			add_location(span, file, 228, 6, 6505);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*speakResult*/ 8) set_data_dev(t, /*speakResult*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(228:12) {#if isRecognizing}",
    		ctx
    	});

    	return block;
    }

    // (234:4) {#each words as word}
    function create_each_block(ctx) {
    	let li;
    	let span;
    	let t1;
    	let div;
    	let p0;
    	let t2_value = /*word*/ ctx[29].word + "";
    	let t2;
    	let t3;
    	let p1;
    	let t4_value = /*word*/ ctx[29].transcription + "";
    	let t4;
    	let t5;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			span = element("span");
    			span.textContent = "🔊";
    			t1 = space();
    			div = element("div");
    			p0 = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			p1 = element("p");
    			t4 = text(t4_value);
    			t5 = space();
    			add_location(span, file, 235, 6, 6710);
    			attr_dev(p0, "class", "svelte-1grd79w");
    			add_location(p0, file, 237, 8, 6776);
    			attr_dev(p1, "class", "svelte-1grd79w");
    			add_location(p1, file, 238, 8, 6803);
    			attr_dev(div, "class", "main_word-text svelte-1grd79w");
    			add_location(div, file, 236, 6, 6739);
    			attr_dev(li, "class", "main_word svelte-1grd79w");
    			toggle_class(li, "active", /*word*/ ctx[29].active);
    			add_location(li, file, 234, 4, 6621);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span);
    			append_dev(li, t1);
    			append_dev(li, div);
    			append_dev(div, p0);
    			append_dev(p0, t2);
    			append_dev(div, t3);
    			append_dev(div, p1);
    			append_dev(p1, t4);
    			append_dev(li, t5);
    			if (remount) dispose();

    			dispose = listen_dev(
    				li,
    				"click",
    				function () {
    					if (is_function(/*onClickWord*/ ctx[11](/*word*/ ctx[29]))) /*onClickWord*/ ctx[11](/*word*/ ctx[29]).apply(this, arguments);
    				},
    				false,
    				false,
    				false
    			);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*words*/ 2 && t2_value !== (t2_value = /*word*/ ctx[29].word + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*words*/ 2 && t4_value !== (t4_value = /*word*/ ctx[29].transcription + "")) set_data_dev(t4, t4_value);

    			if (dirty[0] & /*words*/ 2) {
    				toggle_class(li, "active", /*word*/ ctx[29].active);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(234:4) {#each words as word}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let header;
    	let div0;
    	let t1;
    	let main;
    	let div2;
    	let img;
    	let img_src_value;
    	let t2;
    	let div1;
    	let t3;
    	let t4;
    	let ul;
    	let t5;
    	let footer;
    	let button0;
    	let t7;
    	let button1;
    	let t9;
    	let button2;
    	let dispose;
    	let if_block0 = /*isResultOpen*/ ctx[5] && create_if_block_2(ctx);
    	let each_value_1 = /*pageRequestNumbers*/ ctx[9];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block1 = /*wordTranslate*/ ctx[2] && !/*isRecognizing*/ ctx[4] && create_if_block_1(ctx);
    	let if_block2 = /*isRecognizing*/ ctx[4] && create_if_block(ctx);
    	let each_value = /*words*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			header = element("header");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			main = element("main");
    			div2 = element("div");
    			img = element("img");
    			t2 = space();
    			div1 = element("div");
    			if (if_block1) if_block1.c();
    			t3 = space();
    			if (if_block2) if_block2.c();
    			t4 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			footer = element("footer");
    			button0 = element("button");
    			button0.textContent = "Restart";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Speak please";
    			t9 = space();
    			button2 = element("button");
    			button2.textContent = "Results";
    			attr_dev(div0, "class", "cntr svelte-1grd79w");
    			add_location(div0, file, 195, 2, 5220);
    			attr_dev(header, "class", "svelte-1grd79w");
    			add_location(header, file, 194, 0, 5209);
    			if (img.src !== (img_src_value = /*imgSrc*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Word picture");
    			attr_dev(img, "class", "svelte-1grd79w");
    			add_location(img, file, 223, 4, 6317);
    			attr_dev(div1, "class", "main__text svelte-1grd79w");
    			add_location(div1, file, 224, 4, 6363);
    			attr_dev(div2, "class", "main__pic-text svelte-1grd79w");
    			add_location(div2, file, 222, 2, 6284);
    			attr_dev(ul, "class", "main__words svelte-1grd79w");
    			add_location(ul, file, 232, 2, 6566);
    			add_location(main, file, 221, 0, 6275);
    			attr_dev(button0, "class", "myButton svelte-1grd79w");
    			add_location(button0, file, 246, 2, 6894);
    			attr_dev(button1, "class", "myButton svelte-1grd79w");
    			add_location(button1, file, 247, 2, 6970);
    			attr_dev(button2, "class", "myButton svelte-1grd79w");
    			add_location(button2, file, 248, 2, 7051);
    			attr_dev(footer, "class", "svelte-1grd79w");
    			add_location(footer, file, 245, 0, 6883);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, header, anchor);
    			append_dev(header, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div2);
    			append_dev(div2, img);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t3);
    			if (if_block2) if_block2.m(div1, null);
    			append_dev(main, t4);
    			append_dev(main, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, button0);
    			append_dev(footer, t7);
    			append_dev(footer, button1);
    			append_dev(footer, t9);
    			append_dev(footer, button2);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*onResetRecognition*/ ctx[13], false, false, false),
    				listen_dev(button1, "click", /*onStartRecognition*/ ctx[12], false, false, false),
    				listen_dev(button2, "click", /*onShowResults*/ ctx[14], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (/*isResultOpen*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*pageRequestNumbers, pageRequest, onClickLevelOfWords*/ 33344) {
    				each_value_1 = /*pageRequestNumbers*/ ctx[9];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*imgSrc*/ 1 && img.src !== (img_src_value = /*imgSrc*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (/*wordTranslate*/ ctx[2] && !/*isRecognizing*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div1, t3);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*isRecognizing*/ ctx[4]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty[0] & /*words, onClickWord*/ 2050) {
    				each_value = /*words*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(header);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(footer);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let firstPicture = "./assets/blank.jpg";
    	let imgSrc = firstPicture;
    	let words = [];
    	let wordTranslate = "";
    	let speakResult = "";
    	let isRecognizing = false;
    	let isResultOpen = false;
    	let pageRequest = 0;
    	let groupRequest = 0;
    	let pageRequestNumbers = [0, 1, 2, 3, 4, 5];
    	const recognition = new webkitSpeechRecognition();
    	recognition.continuous = true;

    	const checkWord = word => {
    		const index = words.findIndex(element => element.word === word);

    		if (index !== -1) {
    			$$invalidate(0, imgSrc = words[index].image);
    			$$invalidate(1, words[index].active = true, words);
    		}

    		if (words.every(element => element.active)) {
    			onShowResults();
    		}
    	};

    	recognition.onresult = function (event) {
    		for (let i = event.resultIndex; i < event.results.length; i += 1) {
    			if (event.results[i].isFinal) {
    				$$invalidate(3, speakResult = event.results[i][0].transcript.trim());
    				checkWord(speakResult);
    			}
    		}
    	};

    	const setWords = async (page, group) => {
    		const url = `https://afternoon-falls-25894.herokuapp.com/words?page=${page}&group=${group}`;
    		const res = await fetch(url);
    		const json = await res.json();
    		const dataUrl = "https://raw.githubusercontent.com/a1exymoroz/rslang-data/master/data/";

    		$$invalidate(1, words = json.map(element => {
    			const imageSrc = element.image.split("/");

    			return {
    				word: element.word,
    				image: dataUrl + imageSrc[imageSrc.length - 1],
    				active: false,
    				transcription: element.transcription
    			};
    		}));
    	};

    	const getTranslate = async word => {
    		const API_KEY = "trnsl.1.1.20170506T133756Z.d523dbf15945aee5.28e6bba8287e893a63b6e59990a007a82116e5e1";
    		const url = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${API_KEY}&text=${word}&lang=en-ru`;
    		const res = await fetch(url);
    		const data = await res.json();
    		return data.text[0];
    	};

    	const resetActiveWords = () => {
    		$$invalidate(1, words = words.map(element => {
    			element.active = false;
    			return element;
    		}));
    	};

    	const onClickWord = async data => {
    		if (isRecognizing) {
    			return;
    		}

    		const synth = window.speechSynthesis;
    		synth.speak(new SpeechSynthesisUtterance(data.word));

    		if (!isResultOpen) {
    			$$invalidate(0, imgSrc = data.image);
    			$$invalidate(2, wordTranslate = await getTranslate(data.word));
    		}
    	};

    	const resetData = () => {
    		resetRecognition();
    		resetActiveWords();
    		$$invalidate(0, imgSrc = firstPicture);
    	};

    	const onStartRecognition = () => {
    		recognition.start();
    		$$invalidate(4, isRecognizing = true);
    		$$invalidate(0, imgSrc = firstPicture);
    	};

    	const resetRecognition = () => {
    		recognition.stop();
    		$$invalidate(4, isRecognizing = false);
    		$$invalidate(3, speakResult = "");
    		$$invalidate(2, wordTranslate = "");
    	};

    	const onResetRecognition = () => {
    		resetData();
    	};

    	const onShowResults = () => {
    		resetRecognition();
    		$$invalidate(5, isResultOpen = true);
    		document.body.style.overflow = "hidden";
    	};

    	const onClickLevelOfWords = number => {
    		resetData();
    		$$invalidate(6, pageRequest = number);
    		setWords(pageRequest, groupRequest);
    	};

    	const onNewGameStart = () => {
    		$$invalidate(5, isResultOpen = false);
    		resetData();
    		groupRequest++;
    		setWords(pageRequest, groupRequest);
    		document.body.style.overflow = "auto";
    	};

    	const onClickReturn = () => {
    		$$invalidate(5, isResultOpen = false);
    		document.body.style.overflow = "auto";
    	};

    	setWords(pageRequest, groupRequest);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => onClickReturn();
    	const click_handler_1 = () => onNewGameStart();
    	const click_handler_2 = pageRequestNumber => onClickLevelOfWords(pageRequestNumber);

    	$$self.$capture_state = () => ({
    		firstPicture,
    		imgSrc,
    		words,
    		wordTranslate,
    		speakResult,
    		isRecognizing,
    		isResultOpen,
    		pageRequest,
    		groupRequest,
    		pageRequestNumbers,
    		recognition,
    		checkWord,
    		setWords,
    		getTranslate,
    		resetActiveWords,
    		onClickWord,
    		resetData,
    		onStartRecognition,
    		resetRecognition,
    		onResetRecognition,
    		onShowResults,
    		onClickLevelOfWords,
    		onNewGameStart,
    		onClickReturn,
    		correctAnswers,
    		wrongAnswers
    	});

    	$$self.$inject_state = $$props => {
    		if ("firstPicture" in $$props) firstPicture = $$props.firstPicture;
    		if ("imgSrc" in $$props) $$invalidate(0, imgSrc = $$props.imgSrc);
    		if ("words" in $$props) $$invalidate(1, words = $$props.words);
    		if ("wordTranslate" in $$props) $$invalidate(2, wordTranslate = $$props.wordTranslate);
    		if ("speakResult" in $$props) $$invalidate(3, speakResult = $$props.speakResult);
    		if ("isRecognizing" in $$props) $$invalidate(4, isRecognizing = $$props.isRecognizing);
    		if ("isResultOpen" in $$props) $$invalidate(5, isResultOpen = $$props.isResultOpen);
    		if ("pageRequest" in $$props) $$invalidate(6, pageRequest = $$props.pageRequest);
    		if ("groupRequest" in $$props) groupRequest = $$props.groupRequest;
    		if ("pageRequestNumbers" in $$props) $$invalidate(9, pageRequestNumbers = $$props.pageRequestNumbers);
    		if ("correctAnswers" in $$props) $$invalidate(7, correctAnswers = $$props.correctAnswers);
    		if ("wrongAnswers" in $$props) $$invalidate(8, wrongAnswers = $$props.wrongAnswers);
    	};

    	let correctAnswers;
    	let wrongAnswers;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*words*/ 2) {
    			 $$invalidate(7, correctAnswers = words.filter(element => element.active));
    		}

    		if ($$self.$$.dirty[0] & /*words*/ 2) {
    			 $$invalidate(8, wrongAnswers = words.filter(element => !element.active));
    		}
    	};

    	return [
    		imgSrc,
    		words,
    		wordTranslate,
    		speakResult,
    		isRecognizing,
    		isResultOpen,
    		pageRequest,
    		correctAnswers,
    		wrongAnswers,
    		pageRequestNumbers,
    		getTranslate,
    		onClickWord,
    		onStartRecognition,
    		onResetRecognition,
    		onShowResults,
    		onClickLevelOfWords,
    		onNewGameStart,
    		onClickReturn,
    		groupRequest,
    		recognition,
    		firstPicture,
    		checkWord,
    		setWords,
    		resetActiveWords,
    		resetData,
    		resetRecognition,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: 'world',
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
