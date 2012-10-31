
// This uses require.js to structure javascript:
// http://requirejs.org/docs/api.html#define

function formatDate(d) {
    return (d.getMonth()+1) + '/' +
        d.getDate() + '/' +
        d.getFullYear();
}


define(function(require) {
    // Zepto (http://zeptojs.com/) and Backbone (http://backbonejs.org/)
    var $ = require('zepto');

    var _ = require('underscore');
    var Backbone = require('backbone');

    var addData = require('./data');

    // Receipt verification (https://github.com/mozilla/receiptverifier)
    require('receiptverifier');

    // Installation button
    require('./install-button');

    // Write your app here.

    var Item = Backbone.Model.extend({});
    var ItemList = Backbone.Collection.extend({
        model: Item
    });

    function ViewStack(opts) {
        this.opts = opts;
    }

    ViewStack.prototype.push = function(view) {
        if(!this._stack) {
            this._stack = [];
        }

        this._stack.push(view);

        var methods = view.stack;

        if(methods && methods.open) {
            var args = Array.prototype.slice.call(arguments, 1);
            view[methods.open].apply(view, args);
        }

        if(this.opts.onPush) {
            this.opts.onPush.call(this, view);
        }
    };

    ViewStack.prototype.pop = function() {
        if(this._stack) {
            var view = this._stack.pop();
            var methods = view.stack;

            if(this.opts.onPop) {
                this.opts.onPop.call(this, view);
            }

            if(methods && methods.close) {
                var args = Array.prototype.slice.call(arguments, 1);
                view[methods.close].apply(view, args);
            }
        }
    };


    var stack = new ViewStack({
        onPush: function(view) {
            var section = $(view.el);

            if(this._stack.length > 1) {
                section.css({
                    left: section.width()
                });

                setTimeout(function() {
                    section.addClass('moving');
                    section.css({
                        left: 0
                    });
                }, 0);
            }

            section.css({ zIndex: 100 + this._stack.length });

            if(view.getTitle) {
                $('header h1', section).text(view.getTitle.call(view));
            }

            if(this._stack.length > 1) {
                var nav = $('.navitems.left', section);
                if(!nav.children().length) {
                    nav.append('<button class="back">Back</button>');
                    nav.children('button.back').on('click', function() {
                        stack.pop();
                    });
                }
            }

            if(this._stack.length <= 1) {
                $('.navitems.left button.back', section).remove();
            }

            centerTitle(section);
        },

        onPop: function(view) {
            var section = $(view.el);
            section.css({
                left: section.width()
            });

            //var last = this._stack[this._stack.length-1];
        }
    });

    var EditView = Backbone.View.extend({
        title: 'Edit',

        events: {
            'click button.add': 'save'
        },

        stack: {
            'open': 'open'
        },

        open: function(id) {
            var el = $(this.el);

            if(id !== undefined && id !== null) {
                var model = items.get(id);

                el.find('input[name=id]').val(model.id);
                el.find('input[name=title]').val(model.get('title'));
                el.find('input[name=desc]').val(model.get('desc'));
            }
            else {
                el.find('input[name=id]').val('');
                el.find('input[name=title]').val('');
                el.find('input[name=desc]').val('');
            }
        },

        back: function() {
            stack.pop();
        },

        save: function() {
            var el = $(this.el);
            var id = el.find('input[name=id]');
            var title = el.find('input[name=title]');
            var desc = el.find('input[name=desc]');

            if(id.val()) {
                var model = items.get(id.val());
                model.set({ title: title.val(),
                            desc: desc.val() });
            }
            else {
                items.add(new Item({ id: items.length,
                                     title: title.val(),
                                     desc: desc.val(),
                                     date: new Date() }));
            }

            id.val('');
            title.val('');
            desc.val('');

            stack.pop();
        }
    });

    var DetailView = Backbone.View.extend({
        events: {
            'click button.edit': 'edit'
        },

        stack: {
            'open': 'open'
        },

        getTitle: function() {
            return 'Editing: ' + this.model.get('title');
        },

        open: function(item) {
            this.model = item;

            // Todo: don't bind this multiple times
            this.model.on('change', _.bind(this.render, this));

            this.render();
        },

        edit: function() {
            //window.location.hash = '#edit/' + this.model.id;
            stack.push(editView, this.model.id);
        },

        render: function() {
            var m = this.model;

            $('.contents', this.el).html(
                '<h1>' + m.get('title') + '</h1>' +
                '<p>' + m.get('desc') + '</p>' +
                '<p>' + formatDate(m.get('date')) + '</p>'
            );
        }
    });

    var ListView = Backbone.View.extend({
        initialize: function() {
            this.collection.bind('add', _.bind(this.appendItem, this));

            $('.contents', this.el).append('<ul class="_list"></ul>');
            this.render();
        },

        render: function() {
            $('._list', this.el).html('');

            _.each(this.collection.models, function(item) {
                this.appendItem(item);
            }, this);
        },

        appendItem: function(item) {
            var row = new ListViewRow({ model: item });
            $('._list', this.el).append(row.render().el);
        }
    });

    var ListViewRow = Backbone.View.extend({
        tagName: 'li',

        events: {
            'click': 'open'
        },

        initialize: function() {
            this.model.on('change', _.bind(this.render, this));
        },

        render: function() {
            var m = this.model;

            this.el.innerHTML = m.get('title') + ' - ' +
                '<em>' + formatDate(m.get('date')) + '</em>';

            return this;
        },

        open: function() {
            //window.location.hash = '#details/' + this.model.id;
            stack.push(detailView, items.get(this.model.id));
        }
    });

    var items = new ItemList();
    addData(Item, items);

    $('header button.add').click(function() {
        stack.push(editView);
    });

    var Workspace = Backbone.Router.extend({
        routes: {
            "": "todos",
            "details/:id": "details",
            "edit/:id": "edit",
            "new": "new_"
        },

        todos: function() {
        },

        details: function(id) {
        },

        edit: function(id) {
        },

        new_: function() {
        }
    });

    window.app = new Workspace();
    Backbone.history.start();

    window.app.Item = Item;
    window.app.items = items;

    function centerTitle(section) {
        var header = section.children('header');
        var leftSize = header.children('.navitems.left').width();
        var rightSize = header.children('.navitems.right').width();
        var margin = Math.max(leftSize, rightSize);
        var width = section.width() - margin*2;
        var title = header.children('h1');

        var text = title.text();

        if(text.length > 22) {
            text = text.slice(0, 22) + '...';
        }

        var fontSize;
        if(text.length <= 5) {
            fontSize = 22;
        }
        else if(text.length >= 25) {
            fontSize = 12;
        }
        else {
            var l = text.length - 5;
            var i = 1 - l / 20;

            fontSize = 12 + (22 - 12) * i;
        }

        title.text(text);
        title.css({ left: margin,
                    width: width,
                    fontSize: fontSize + 'pt' });
    }

    function initUI() {
        $('section > header').each(function() {
            var header = $(this);
            var h1 = $('h1', header)[0];
            var els = header.children();
            var i = els.get().indexOf(h1);
            var wrapper = '<div class="navitems"></div>';

            els.slice(0, i).wrapAll($(wrapper).addClass('left'));
            els.slice(i+1, els.length).wrapAll($(wrapper).addClass('right'));
        });

        var appHeight = $('#app').height();

        $('#app > section').each(function() {
            var el = $(this);
            el.width($('body').width());

            if(!el.children('header').length) {
                var first = el.children().first();
                var header = $('<header></header>');

                if(first.is('h1')) {
                    first.wrap(header);
                }
                else {
                    el.prepend(header);
                    header.append('<h1>section</h1>');
                }
            }

            var header = $('header', el);
            if(!header.children('.navitems.left').length) {
                header.prepend('<div class="navitems left"></div>');
            }

            if(!header.children('.navitems.right').length) {
                header.append('<div class="navitems right"></div>');
            }

            var header = el.children('header').remove();

            var contents = el.children();
            if(!contents.length) {
                el.append('<div class="contents"></div>');
            }
            else {
                contents.wrapAll('<div class="contents"></div>');
            }
            el.prepend(header);

            var height = el.children('header').height();
            el.children('.contents').css({ height: appHeight - height });
        });
    }

    $('#app > section').show();
    initUI();

    var editView = new EditView({ el: $('#app > section.edit') });
    var detailView = new DetailView({ el: $('#app > section.detail') });
    var listView = new ListView({ collection: items,
                                  el: $('#app > section.list')});
    stack.push(listView);
    centerTitle($(listView.el));

    // window.onresize = function() {
    //     initUI();
    // };

});
