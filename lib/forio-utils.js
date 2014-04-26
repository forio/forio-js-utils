'use strict';

var _ = require('lodash');

var SMALL = '(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|v[.]?|via|vs[.]?)';
var PUNCT = '([!"#$%&\'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]*)';

var utils = {

    // General
    // -------------

    // Return a namespace or create it if it doesn't exist.
    namespace: function (obj, path) {
        var scopes = path.split('.');
        var namespace = obj;

        _.each(scopes, function (scope) {
            namespace = (namespace[scope] = namespace[scope] || {});
        });

        return namespace;
    },

    // returns the value of the nested path in the object
    // or undefined if the path is not valid
    nested: function (obj, path) {
        var scopes = path.split('.');
        var namespace = obj;

        _.each(scopes, function (scope) {
            namespace = namespace[scope];
        });

        return namespace;
    },

    // Returns an object that can be extended similarly to clasical inheritence .
    // See `Backbone.extend` for an example.
    extendable: function (obj) {
        obj.extend = function (prototype, extension) {
            var parent = this;
            var child;

            if (prototype && _.has(prototype, 'constructor')) {
                child = prototype.constructor;
            } else {
                child = function () {
                    parent.apply(this, arguments);
                };
            }

            _.extend(child, parent, extension);

            var Surrogate = function () {
                this.constructor = child;
            };

            Surrogate.prototype = parent.prototype;
            child.prototype = new Surrogate();

            if (prototype) {
                _.extend(child.prototype, prototype);
            }

            child._super_ = parent.prototype;

            return child;
        };

        return obj;
    },

    // Return the first non-null argument.
    coalesce: function () {
        var args = arguments;
        var i;
        var arg;
        var length = args.length;

        for (i = 0; i < length; i++) {
            arg = args[i];

            if (arg != null) {
                return arg;
            }
        }
    },

    // Numbers
    // -------------

    // Returns the sum of a list.
    sum: function (list) {
        return _.reduce(list, function (memo, n) { return memo + n; }, 0);
    },

    // Returns the mean of a list.
    mean: function (list) {
        return utils.sum(list) / _.size(list);
    },

    linearRegression: function (x, y) {
        var xBar = utils.mean(x);
        var yBar = utils.mean(y);

        var numerator = 0;
        var denominator = 0;

        for (var i = 0, len = x.length; i < len; i++) {
            numerator += (x[i] - xBar) * (y[i] - yBar);
            denominator += Math.pow(x[i] - xBar, 2);
        }

        var slope = numerator / denominator;
        var intercept = yBar - slope * xBar;

        return {
            minX: _.min(x),
            maxX: _.max(x),
            slope: slope,
            intercept: intercept
        };
    },

    // Returns the variance of a list.
    variance: function (list) {
        var mean = utils.mean(list);
        var length = _.size(list);

        return _.reduce(list, function (memo, x) { return memo + Math.pow(mean - x, 2); }, 0) / length;
    },

    // Returns the standard deviation of a list.
    stdev: function (list) {
        return Math.sqrt(utils.variance(list));
    },

    // Returns an object containing the frequency of each occurance in a list.
    frequency: function (list) {
        var result = {};

        _.each(list, function (item) {
            result[item] = result[item] || 0;

            result[item]++;
        });

        return result;
    },

    // Returns the median of a list.
    median: function (list) {
        var sorted = _.sortBy(list);
        var middle = sorted.length / 2;

        return middle === parseInt(middle, 10) ? (list[middle - 1] + list[middle + 1]) / 2 : list[Math.floor(middle)];
    },

    // Divides 2 integers and returns the resultant quotient and remainder in an object.
    integerDivision: function (a, b) {
        return {
            quotient: ~~(a / b),
            remainder: a % b
        };
    },

    // Rounds a number to the specified number of places.
    roundTo: function (value, places) {
        return Math.round(value * Math.pow(10, places)) / Math.pow(10, places);
    },

    roundToNearest: function (value, n) {
        return Math.round(value / n) * n;
    },

    // Builds a range from start to end given a pattern [a, -b, c, -d, e].
    // Positive numbers are included in the range, negative ones are skipped.
    patternedRange: function (start, end, pattern) {
        var n = start;
        var i = 0;
        var output = [];

        while (n < end) {
            var step = pattern[i];

            output = step > 0 ? output.concat(_.range(n, n + step)) : output;

            n += Math.abs(step);
            i += 1;

            if (i === pattern.length) i = 0;
        }

        return output;
    },

    // Strings
    // -------------

    parseCSV: function (csv, columns, options) {
        var defaults = {
            separator: /\t|,/,
            linebreak: /\n|\r\n/,
            cast: true
        };

        options = _.defaults(options || {}, defaults);

        return _.map(csv.split(options.linebreak), function (line) {
            var row = {};
            var fields = line.split(options.separator);

            _.each(columns, function (col, index) {
                if (fields[index] !== undefined) {
                    var trimmed = utils.trim(fields[index]);

                    row[utils.camelCase(col)] = options.cast ? utils.castToLiteral(trimmed) : trimmed;
                }
            });

            return row;
        });
    },

    // Trims whitespace from the beginning and end of a string.
    trim: function (s) {
        return s.replace(/^\s+|\s+$/g, '');
    },

    // Returns a string with an uppercase first letter.
    capitalize: function (string) {
        return string.substr(0, 1).toUpperCase() + string.substr(1);
    },

    // Returns a lowercase version of a string.
    lowerCase: function (string) {
        return (string == null ? '' : string).toLowerCase();
    },

    camelCase: function (string, separator) {
        var regex = new RegExp((separator || ' ') + '(.)', 'g');

        return string.toLowerCase().replace(regex, function ($0, $1) {
            return $1.toUpperCase();
        });
    },

    // Returns a string with each word capitalized, unless it is blacklisted.
    // The default blacklist is... a, an, and, as, at, but, by, en, for, if, in, of, on, or, the, to, v, via, vs.
    titleCase: function (title, blacklist) {
        var parts = [];
        var split = /[:.;?!] |(?: |^)["Ò]/g;
        var index = 0;

        title = utils.lowerCase(title);
        blacklist = blacklist || SMALL;

        while (true) {
            var m = split.exec(title);

            parts.push(title.substring(index, m ? m.index : title.length)
                .replace(/\b([A-Za-z][a-z.'Õ]*)\b/g, function (all) {
                    return (/[A-Za-z]\.[A-Za-z]/).test(all) ? all : utils.capitalize(all);
                })
                .replace(new RegExp('\\b' + blacklist + '\\b', 'ig'), utils.lowerCase)
                .replace(new RegExp('^' + PUNCT + blacklist + '\\b', 'ig'), function (all, PUNCT, word) {
                    return PUNCT + utils.capitalize(word);
                })
                .replace(new RegExp('\\b' + blacklist + PUNCT + '$', 'ig'), utils.capitalize));

            index = split.lastIndex;

            if (m) {
                parts.push(m[0]);
            } else {
                break;
            }
        }

        return parts.join('').replace(/ V(s?)\. /ig, ' v$1. ')
            .replace(/(['Õ])S\b/ig, '$1s')
            .replace(/\b(AT&T|Q&A)\b/ig, function (all) {
                return all.toUpperCase();
            });
    },

    // Returns `true` if the input is null, undefined, or an empty string.
    isNullOrEmpty: function (string) {
        return string == null || string === '';
    },

    // Returns `true` if the input is null, undefined, or string of only whitespace.
    isNullOrWhitespace: function (string) {
        return string == null || /^\s*$/.test(string);
    },

    // Casts a string to its literal version
    // Example: `"true"` because `true`.
    castToLiteral: function (string) {
        string = string + '';

        if (string === 'true') {
            return true;
        } else if (string === 'false') {
            return false;
        } else if (/^[\-+]?([0-9]+)?[\.]?[0-9]+([eE][0-9]+)?$/.test(string)) {
            return parseFloat(string);
        } else {
            return string;
        }
    },

    englishList: function (list) {
        var length = list.length;

        return _.map(list, function (item, i) {
            if (length === 1) {
                return item;
            }

            if (length === 2) {
                return i === 0 ? item + ' and' : item;
            }

            if (length > 2) {
                return i < length - 1 ? item + ',' : 'and ' + item;
            }
        }).join(' ');
    },

    // TODO, needs a list of words that have weird pluralizations.
    pluralize: function (length, word) {
        return length === 0 || length > 1 ? word + 's' : word;
    }

};

module.exports = utils;
