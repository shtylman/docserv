// vendor
var dom = require('dom');
var request = require('superagent');
var semver = require('semver');

// container for sidebar items
var sidenav = dom('#modules-list');

// readme area
var readme = dom('#readme');

// template for sidebar items
var sidenav_template = document.querySelector('script[name="sidenav-module"]');

function cssbind(elem, map) {

    var binding = {};

    Object.keys(map).forEach(function(prop) {
        var selector = map[prop];

        var subelem = elem.querySelector(selector);
        Object.defineProperty(binding, prop, {
            get: function() {
                return subelem.textContent;
            },
            set: function(val) {
                subelem.textContent = val;
            }
        });
    });

    return binding;
}

sidenav.on('click', 'li', function(ev) {
    sidenav.find('li.active').removeClass('active');
    dom(ev.currentTarget).addClass('active');

    request
        .get('/modules/' + dom(ev.currentTarget).data('module-name'))
        .end(function(res) {
            var html = res.body.readme;
            if (!html) {
                return readme.html('no readme file');
            }
            readme.html(html);
        });
});

function get_modules(cb) {
    request
        .get('/modules')
        .set('Accept', 'application/json')
        .end(function(res) {
            cb(null, res.body);
        });
};

get_modules(function(err, modules) {
    modules.forEach(function(module, idx) {

        var elem = dom(sidenav_template.text)[0];
        dom(elem).data('module-name', module.name);

        var bound = cssbind(elem, {
            name: '.name > span:last-of-type',
            version: '.version'
        });

        bound.name = module.name;
        bound.version = module.version;

        var module_icon = dom(elem).find('.name .icon');

        if (!module.installed) {
            module_icon
                .removeClass('hidden')
                .attr('title', 'not installed')
                .text(' not installed')
        }
        else if (module.extraneous) {
            module_icon
                .removeClass('hidden')
                .attr('title', 'extraneous')
                .text(' extraneous')
        }
        else if (module.invalid) {
            module_icon
                .removeClass('hidden')
                .attr('title', 'invalid')
                .text(' invalid version')
        }

        // finally add to document
        sidenav.append(elem);

        // get latest version
        request
            .get('/modules/' + module.name + '/latest')
            .end(function(res) {
                var latest = res.body.version;
                if (semver.gt(latest, module.version)) {
                    dom(elem)
                        .find('.newer-version')
                        .removeClass('hidden')
                        .attr('title', 'new version available: ' + latest)
                        .css('display', 'inline');
                }
            });

        if (idx === 0) {
            dom(elem).emit('click', { bubbles: true });
        }
    });
});

request.get('/version').end(function(res) {
    var current = res.body.current;
    var latest = res.body.latest;

    if (current !== latest) {
        dom('#new-version-banner')
            .show()
            .find('.version')
            .text(latest);

        dom('#new-version-banner').find('.close').on('click', function(ev) {
            dom('#new-version-banner').hide();
        });
    }
});

