Parse.$ = jQuery;
Parse.initialize("MUqbNflspPmmtdBLtHFgO8dkQWVdMZzSGWxmN4NS", "2s1HRDxuzn3M6i7ESleYrJKjjyMexDDIbeXYbdvD");

$(document).on( "mobileinit",
    function () {
        console.log('mobile inited');///c
        $.mobile.ajaxEnabled = false;
        $.mobile.linkBindingEnabled = false;
        $.mobile.hashListeningEnabled = false;
        $.mobile.pushStateEnabled = false;
        $.mobile.changePage.defaults.changeHash = false;


        // Safari, in Private Browsing Mode, looks like it supports localStorage but all calls to setItem
        // throw QuotaExceededError. We're going to detect this and just silently drop any calls to setItem
        // to avoid the entire page breaking, without having to do a check at each usage of Storage.
        if (typeof localStorage === 'object') {
            try {
                localStorage.setItem('localStorage', 1);
                localStorage.removeItem('localStorage');
            } catch (e) {
                Storage.prototype._setItem = Storage.prototype.setItem;
                Storage.prototype.setItem = function() {};
                alert('Please turn off private browsing for an optimal experience.');
            }
        }

    }
)

var App;

App.params = {};
App.params.test = false;
App.params.store = 'magnolia';


$(function() {
    App = new (Parse.View.extend({
        Models: {},
        Collections: {},
        Views: {},
        location: {},
        initialize: function(){
            
        },
        start: function(){
            App.Collections.stores = new App.Collections.Stores();
            App.Collections.items = new App.Collections.Items();
            App.Collections.order = new App.Collections.Order();
            App.Collections.recentOrders = new App.Collections.RecentOrders();
            App.router = new App.Router();
            Parse.history.start({});
            App.initUser();
        },
        initUser: function () {
            if (Parse.User.current()) {
                console.log('user logged in, showing user links');
                Parse.User.current().fetch();
                if(Parse.User.current().attributes.location){
                    console.log('Location available, skip welcome ===');///c
                    console.log(Parse.User.current().attributes.location);///c
                    var promise = new $.Deferred();
                    this.getData(Parse.User.current().attributes.location,promise);
                }
                if(Parse.User.current().attributes.address){
                    $("#order #address-input").val(Parse.User.current().attributes.address);
                }
                App.user = Parse.User.current();
                App.Views.panel.showUserLinks();
                App.getOrders().then(function(orders){
                    App.Collections.recentOrders.reset(orders);
                    App.Views.review.reviewable = App.Collections.recentOrders.getReviewable();
                    if (App.Views.review.reviewable.length){
                        App.Views.review.initMenu();
                    }
                });
                if(App.user.attributes.address){
                    $("#order #address-input").val(App.user.attributes.address);
                }
                if(!App.user.attributes.verified){
                    $("#verify-link").show();
                    $("#verify-settings-link").html("Get Verified");
                } else {
                    $("#verify-link").hide();
                    $("#verify-settings-link").html("Update Verification<br><span>Name, Phone, Rec & ID</span>");
                }

                if(App.user.attributes.isStore) {
                    App.router.navigate("dash", {trigger: true});
                }
            } else {
                console.log('user not logged in, showing user links');
                App.Views.panel.showPublicLinks();
            }
        },
        getOrders: function(){
            return Parse.Cloud.run("getOrders", null, {
                success: function (results) {
                    console.log(results);
                },
                error: function (error) {
                    console.log(error);
                }
            });
        },
        getGeoLocation: function(){
            console.log('getGeoLocation Triggered!');///c
            var promise = new $.Deferred();
            var that = this;
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    console.log('FOUND YOU!');///c
                    App.location.geo = new Parse.GeoPoint({latitude: position.coords.latitude, longitude: position.coords.longitude});
                    App.location.default = false;
                    App.getAddress();
                    return that.getData(App.location.geo, promise);
                }, function (error) {
                    console.log('Error getting current location'); ///c
                    if (error.code === 1) {
                        console.log("User denied the request for Geolocation.");
                        return promise.reject("You need to allow Geolocation");
                    } else if (error.code === 2){
                        console.log("Location information is unavailable.");
                        return promise.reject("Location is not currently available");
                    } else if (error.code === 3){
                        console.log("The request to get user location timed out.");
                        return promise.reject("Location request timed out");
                    } else if (error.code === 4){
                        console.log("An unknown error occurred.");
                        return promise.reject("Oops, something went wrong");
                    }
                });
            } else {
                console.log('Error accessing geolocation'); ///c
                return promise.reject('Geolocation not supported');
            }
            return promise.promise();
        },
        getZipLocation: function(zip){
            console.log("getZipLocation SEARCHING");
            var promise = new $.Deferred();
            var that = this;
            $.ajax({
                url : "https://maps.googleapis.com/maps/api/geocode/json?address="+zip,
                method: "POST",
                success:function(data){
                    console.log(data);///c
                    if (data.status == "OK"){
                        App.location.geo = new Parse.GeoPoint({latitude: data.results[0].geometry.location.lat, longitude: data.results[0].geometry.location.lng});
                        App.location.zip = zip;
                        App.location.default = false;
                        // address = data.results[0].formatted_address;
                        return that.getData(App.location.geo, promise);
                    } else if (data.status == "ZERO_RESULTS") {
                        console.log('no results found');
                        promise.reject('Zipcode not found');
                    } else {
                        console.log("some other error");
                        promise.reject('Zipcode not found');
                    }
                    console.log(data.status);
                }
            });
            return promise.promise();
        },
        // getDefaultLocation: function(){
        //     var promise = new $.Deferred();
        //     App.location.geo = new Parse.GeoPoint({latitude: 37, longitude: -121});
        //     App.location.default = true;
        //     console.log('Setting default location');///c
        //     return this.getData(App.location.geo, promise);
        // },
        getData: function(location, promise){
            return Parse.Cloud.run('find', {test: false, location: location}, {
                success: function (results) {
                    if(results.length){
                        console.log('Found stores and items near === '+App.location);///c
                        console.log(results);///c
                        console.log('Going home!');///c
                        $("#panel-menu .zip-input").val(App.location.zip);
                        App.router.navigate("home", {trigger: true});
                        App.Collections.stores.reset(results);
                        var allItems = _.uniq(_.flatten(_.compact(App.Collections.stores.pluck('items'))),function(item){return item.id});
                        App.Collections.items.reset(_.filter(allItems, function(item){ return item.get("live") === true; }));
                        App.trigger("app:update");
                        if(App.user && App.user.attributes.location !== location) {
                            console.log('Updating location on App.user');///c
                            App.user.set("location",location);
                            App.user.set("address",App.location.address);
                            App.user.set("zip",App.location.zip);
                            App.user.save();                            
                        }
                        promise.resolve();
                    } else {
                        console.log('No stores found, keep updated');///c
                        App.router.navigate("getnotified", {trigger: true});
                        promise.resolve();
                    }
                },
                error: function (error) {
                    promise.reject("Couldn't find your location");
                    console.log(error);
                }
            });
        },
        getAddress: function(){
            console.log('finding address for ===');///c
            console.log(App.location);///c
            $.ajax({
               url : "https://maps.googleapis.com/maps/api/geocode/json?latlng="+App.location.geo.latitude+','+App.location.geo.longitude,
               method: "POST",
               success:function(data){
                    if (data.status == "OK"){
                        console.log(data);///c
                        var address = data.results[0].formatted_address;
                        App.location.address = address;
                        $("#order #address-input").val(address);
                        App.location.zip = extractFromAdress(data.results[0].address_components,"postal_code");
                        $(".zip-input").val(App.location.zip);
                        
                        console.log(App.location);///c
                    } else if (data.status == "ZERO_RESULTS") {
                        console.log('no results found');

                    } else {
                        console.log("some other error");
                    }
                    console.log(data.status);
               }
            });

            // http://stackoverflow.com/questions/8150132/how-to-extract-postal-code-from-v3-google-maps-api
            function extractFromAdress(components, type){
                for (var i=0; i<components.length; i++)
                    for (var j=0; j<components[i].types.length; j++)
                        if (components[i].types[j]==type) return components[i].long_name;
                return "";
            }
        },
        addItem: function(itemModel, options){
            console.log('ADD ITEM TRIGGERED WITH AMOUNT, TOTAL = '+options.amount+","+options.total);
            var promise = new $.Deferred();
            if (App.Collections.order.contains(itemModel)) {
                console.log('item already added, updating amount');
                itemModel.set("total", options.total);
                itemModel.set("amount", options.amount);
                return promise.resolve('updating amount');
            } else {
                //checks the store of the order, assigns the store if no store, adds if same store, asks the user to clear order if from a different store
                var newStore = App.Collections.stores.getStoreById(itemModel.attributes.store.id);
                if (!App.Collections.order.store) {
                    console.log('no store assigned! setting store and adding item');
                    App.Views.order.setStore(newStore);
                    App.trigger('app:set-store');
                    itemModel.set("total", options.total);
                    itemModel.set("amount", options.amount);
                    App.Collections.order.add(itemModel);
                    return promise.resolve('item added');
                } else if (App.Collections.order.store.id === itemModel.attributes.store.id) {
                    console.log('item is from the same store, adding item');
                    itemModel.set("total", options.total);
                    itemModel.set("amount", options.amount);
                    App.Collections.order.add(itemModel);
                    return promise.resolve('item added');
                } else if (App.Collections.order.store.id !== itemModel.attributes.store.id){
                    if (confirm("Would you like to add "+itemModel.attributes.name+" and start a new order with "+newStore.attributes.name+"? Cancel to keep your current order of "+App.Collections.order.length+" item(s) with "+newStore.attributes.name+".") == true) {
                        console.log('item ADDED, order reset');
                        App.Views.order.resetOrder().setStore(App.Collections.stores.getStoreById(itemModel.attributes.store.id));
                        App.trigger('app:set-store');
                        itemModel.set("total", options.total);
                        itemModel.set("amount", options.amount);
                        App.Collections.order.add(itemModel);
                        return promise.resolve('item added');
                    } else {
                        //cancel item add, do nothing.
                        console.log('item add canceled');
                        return promise.reject('item not added');
                    }
                }
            }
        },
        removeItem: function(itemModel){
            var promise = new $.Deferred();
            if (App.Collections.order.contains(itemModel)) {
                itemModel.set("total", 0);
                itemModel.set("amount", 0);
                App.Collections.order.remove(itemModel);
                if (!App.Collections.order.length) {
                    App.Collections.store = undefined;
                    App.trigger("app:set-store");
                }
                return promise.resolve('item removed from App.removeItem');
            } else {
                console.log('cant remove, item not in order');
                return promise.resolve('cant remove, item not in order');
            }
        },
        submitOrder: function(options){
            if (!Parse.User.current()) {
                App.router.navigate("login", {trigger: true});
                App.Views.welcome.$(".message").html('You need to be logged in to submit an order.');
                return Promise.reject({message:'You need to be logged in to submit an order.'});
            } else if (!Parse.User.current().attributes.verified) {
                // } else if (!Parse.User.current().attributes.name || !Parse.User.current().attributes.phone) {
                App.router.navigate("verify", {trigger: true});
                return Promise.reject({message:'You need to get verified before submitting an order.'});
            } else if (!options.address) {
                return Promise.reject({message:'You need to enter your address.'});
            } else {
                return Parse.Cloud.run("order", options, {
                    success: function (results) {
                        console.log(results);
                        App.user.set('address',options.address);
                        App.user.set('location',App.location.geo);
                        App.user.set('zip',App.location.zip);
                        App.user.save();
                    },
                    error: function (error) {
                        console.log(error);
                    }
                });
            }
        },
        submitReview: function(options){
            console.log(options);
            return Parse.Cloud.run("review", options, {
                success: function (results) {
                    console.log(results);
                },
                error: function (error) {
                    console.log(error);
                }
            });
        }
    }))({el: document.body});

    ///////// Models    
    App.Models.User = Parse.User.extend({
        className: "User"
    });
    App.Models.Store = Parse.Object.extend({
        className: "Store",
        getDistance: function(){
            if(this.attributes.distance) {
                return this.attributes.distance;
            } else {
                this.attributes.distance = App.location.milesTo(this.get("location"));
                return this.attributes.distance;
                // return this.attributes.distance = App.location.milesTo(this.get("location"));
            }
        },
        getHours: function(day){
            function tConvert (time) {
                    time = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
                    if (time.length > 1) {
                        time = time.slice (1);
                        time[5] = +time[0] < 12 ? 'AM' : 'PM';
                        time[0] = +time[0] % 12 || 12;
                    }
                    return time.join ('');
            }

            var today = day ? day : new Date().getDay();
            console.log(today);
            if(this.attributes.displayHours) {
                console.log('There are display hours, returning the same');///c
                return this.attributes.displayHours[today];
            } else {
                this.attributes.displayHours = [];
                _.each(this.attributes.hours, function(hour){
                    if(hour[0]){
                        this.attributes.displayHours.push(tConvert(hour[0])+' to '+tConvert(hour[1]));
                    } else {
                        this.attributes.displayHours.push('Closed');
                    }
                }, this);
                return this.attributes.displayHours[today];
            }
        }
    });
    App.Models.Item = Parse.Object.extend({
        initialize: function(){
            
        },
        className: "Item",
        getFilters: function(){
            if(this.attributes.filters) {
                return this.attributes.filters;
            } else {
                this.attributes.filters = [];
                _.each(this.attributes.category, function(category){
                    this.attributes.filters.push(category);
                }, this);
                _.each(this.attributes.type, function(type){
                    this.attributes.filters.push(type);
                }, this);
                if(this.attributes.featured) {
                    this.attributes.filters.push("Featured");
                }
                if(this.attributes.special) {
                    this.attributes.filters.push("Special");
                }
                this.attributes.filters.push(App.Collections.stores.getStoreById(this.attributes.store.id).attributes.link);
                // this.attributes.store = App.Collections.stores.getStoreById(this.attributes.store.id);
                // this.attributes.filters = this.attributes.filters.concat(this.attributes.name.split(" "));
                return this.attributes.filters;
            }
        },
        getRange: function(){
            if(this.attributes.range) {
                return this.attributes.range;
            } else {
                var ranges = [];
                _.each(this.attributes.price, function(price){
                    ranges.push(price.total / price.amount);
                });
                return this.attributes.range = {min: Math.round(_.min(ranges)), max: _.max(ranges)};
            }
        }
    });
    App.Models.Order = Parse.Object.extend({
        className: "Order"
    });
    App.Models.Vote = Parse.Object.extend({
        className: "Vote"
    });


    /////////// Collections   
    App.Collections.Stores = Parse.Collection.extend({
        model: App.Models.Store,
        comparator: function(model) {
            if (this.order === "top") {
                return -model.get("topWeek");
            } else if (this.order === "new") {
                return -model.createdAt;
            } else if (this.order === "local") {
                return model.getDistance();
            } else {
                return model;
            }
        },
        getStoreById: function(storeId){
            return this.filter(function(store){ return store.id === storeId; })[0];
        },
        getStoreByLink: function(storeLink){
            return this.filter(function(store){ return store.get('link') === storeLink; })[0];            
        },
        getIndex: function(storeModel){
            return this.indexOf(storeModel);
        }
    });

    App.Collections.Items = Parse.Collection.extend({
        model: App.Models.Item,
        comparator: function(model) {
            if (this.order === 'top') {
                return -model.get('topWeek');
            } else if (this.order === 'price') {
                return model.get('price')[0].total*(1-model.get("special"));
            } else if (this.order === 'new') {
                return -model.createdAt;
            } else {
                return model;
            }
        },
        sortByAmount: function(array){
            var itm, a= [], L= array.length, o= {};
            for(var i= 0; i<L; i++){
                itm= array[i];
                if(!itm) continue;
                if(o[itm]== undefined) o[itm]= 1;
                else ++o[itm];
            }
            for(var p in o) a[a.length]= p;
            return a.sort(function(a, b){
                return o[b]-o[a];
            });
        },
        getItemById: function(itemId){
            return this.filter(function(item){ return item.id === itemId; })[0];
        },
        getItemByName: function(itemName){
            return this.filter(function(item){ return item.attributes.name === itemName; })[0];
        },
        getTypes: function(){
            var types = _.flatten(this.pluck('type'));
            return this.sortByAmount(types);
        },
        getCategories: function(){
            var categories = _.flatten(this.pluck('category'));
            return this.sortByAmount(categories);
        },
        byFilter: function(filters){
            //Takes an array of types, returns the items where the types are included.    
            return this.filter(function(item){ 
                return _.intersection(item.getFilters(), filters).length >= filters.length; });
        },
        // Accepts a partial string array of filters and finds items that match their nane to at least one
        bySearchFilter: function (filters) {
            return this.filter(function (model) {
                return _.some(filters, function (filter) {
                    return model.get('name').toLowerCase().indexOf(filter.toLowerCase()) != -1;
                });
            });
        },

        //delete?
        byType: function(type){
            //Takes an array of types, returns the items where the types are included.    
            return this.filter(function(item){ 
                return _.intersection(item.attributes.type, type).length >= type.length; });
        },
        byCategory: function(categories){
            return this.filter(function(item){ 
                return _.intersection(item.attributes.category, categories).length >= categories.length; });
        }
    });

    App.Collections.Order = Parse.Collection.extend({
        model: App.Models.Item,
        getItem: function(itemId){
            return this.filter(function(item){ return item.id === itemId; })[0];
        },
        updateTotal: function(){
            this.amount = 0;
            this.total = 0;
            this.each(function(item){
                this.total += item.attributes.total;
                this.amount += item.attributes.amount;
            }, this);
            return this.amount;
        }
    });

    App.Collections.RecentOrders = Parse.Collection.extend({
        model: App.Models.Order,
        // getPending: function(){
        //     return this.filter(function(order){ return order.get("confirmedAt"); });
        // },
        // Get's the to be reviewed orders and returns each review with [Amount, Total, Item Name, Item ID, Store Name, Store ID, Order ID, Review]
        getReviewable: function(){
            this.items = [];
            var reviewableOrders = this.filter(function(order){ 
                return order.get('confirmedAt') | order.get('completedAt') && !order.get("reviewedAt"); 
            });
            console.log(reviewableOrders);///c
            var that = this;
            var reviewable = [];
            _.each(reviewableOrders, function(order){
                that.items.push(order.attributes.store.attributes.items);
                _.each(order.get("items"),function(item){
                    reviewable.push({
                        name: item[2], 
                        itemId: item[3], 
                        storeName: order.attributes.store.attributes.name, 
                        storeId: order.attributes.store.id, 
                        orderId: order.id
                    });
                });
            });
            this.items = _.flatten(this.items,1);
            return reviewable;
        },
        getItem: function(itemId){
            return this.items.filter(function(item){ return item.id === itemId; })[0];
        }
    });

    App.Collections.Votes = Parse.Collection.extend({
        model: App.Models.Vote
    });


    // ///////// Views 
    App.Views.Welcome = Parse.View.extend({
        initialize: function() {

        },
        showFind: function(message){
            this.$(".welcome-options").html('<div data-role="controlgroup" data-type="horizontal"><input type="text" name="zip" value="" placeholder="ZIP" class="zip-input main-link main-font" autocomplete="off"><span data-role="none" id="find-geo-button" class="flaticon-arrow green"></span></div><p class="message gray"></p><button id="find-zip-button" class="ui-btn green-btn main-link main-font larger-font bottom-link">Find herbs</button>');
            this.$(".message").html(message || "");
            // this.findGeo();
        },  
        showSignup: function(){
            App.router.navigate("signup", {trigger: false});
            $(".welcome-options").html('<p class="message gray"></p><div class="ui-input-text ui-body-inherit"><input type="email" name="email" id="email-input" class="main-font main-input" value="" placeholder="Email" required></div><div class="ui-input-text ui-body-inherit"><input type="password" name="password" id="password-input" class="main-font main-input" value="" placeholder="Password" required></div><a class="show-login-link">Log in</a><button id="signup-button" class="ui-btn green-btn main-link main-font bottom-link">Sign up</button>');
        },
        showLogin: function(){
            App.router.navigate("login", {trigger: false});
            $(".welcome-options").html('<p class="message gray"></p><div class="ui-input-text ui-body-inherit"><input type="email" name="email" id="email-input" class="main-font main-input" value="" placeholder="Email" required></div><div class="ui-input-text ui-body-inherit"><input type="password" name="password" id="password-input" class="main-font main-input" value="" placeholder="Password" required></div><a class="show-reset-link">Reset</a><a class="show-signup-link">Sign up</a><button type="submit" id="login-button" class="ui-btn green-btn main-link main-font bottom-link">Log in</button>');
        },
        showReset: function(){
            App.router.navigate("reset", {trigger: false});
            $(".welcome-options").html('<p class="message gray"></p><div class="ui-input-text ui-body-inherit"><input type="email" name="email" id="email-input" class="main-font main-input" value="" placeholder="Email"></div><a class="show-login-link">Log in</a><button type="submit" id="reset-button" class="ui-btn green-btn main-link main-font bottom-link">Reset password</button>');
        },
        showGetNotified: function(){
            App.router.navigate("getnotified", {trigger: false});
            $(".welcome-options").html('<p class="message gray">Oooo, no herbs in your area... Yet. Fill out your email and we will let you know when that changes. </p><div class="ui-input-text ui-body-inherit"><input type="email" name="email" id="email-input" class="main-font main-input" value="" placeholder="Email"></div><a class="show-login-link">Log in</a><button type="submit" id="notify-button" class="ui-btn green-btn main-link main-font bottom-link">Get Notified</button>');
        },
        events: {
            "click #find-zip-button": "findZip",
            "click #find-geo-button": "findGeo",
            "click .delivery-link": "delivery",
            "click .pickup-link": "pickup",
            "click .show-login-link": "showLogin",
            "click .show-signup-link": "showSignup",
            "click .show-reset-link": "showReset",
            "click #signup-button": "signup",
            "click #login-button": "login",
            "click #reset-button": "reset",
            "click #notify-button":"getNotified"
        },
        findZip: function(){
            var that = this;
            this.$("#find-geo-button, #find-zip-button").attr("disabled", "disabled");
            this.$("#find-geo-button").append('<div class="signal"></div>');
            App.getZipLocation(this.$(".zip-input").val()).then(function(){
                console.log('Continue with zip: '+that.$(".zip-input").val());///c
                that.$("#find-geo-button, #find-zip-button").removeAttr("disabled");
                that.$("#find-geo-button > .signal").remove();
            }, function(error) {
                console.log(error); 
                that.$(".message").html(error);
                that.$("#find-geo-button, #find-zip-button").removeAttr("disabled");
                that.$("#find-geo-button > .signal").remove();
            });
        },
        findGeo: function(){
            var that = this;
            this.$("#find-geo-button, #find-zip-button").attr("disabled", "disabled");
            this.$("#find-geo-button").append('<div class="signal"></div>');
            App.getGeoLocation().then(function(){
                that.$("#find-geo-button, #find-zip-button").removeAttr("disabled");
                that.$("#find-geo-button > .signal").remove();
            }, function(error) {
                console.log(error); 
                that.$(".message").html(error);
                that.$("#find-geo-button, #find-zip-button").removeAttr("disabled");
                that.$("#find-geo-button > .signal").remove();
            });
        },
        delivery: function(){
            $(".pickup-link").removeClass("active");
            $(".delivery-link").addClass("active");
        },
        pickup: function(){
            $(".delivery-link").removeClass("active");
            $(".pickup-link").addClass("active");
        },
        signup: function(e){
            if (e) { e.preventDefault(); }
            this.$("#signup-button").attr("disabled", "disabled");
            var that = this;
            var email = this.$("#email-input").val();
            var password = this.$("#password-input").val();
            var userACL = new Parse.ACL(Parse.User.current());
            Parse.User.signUp(email, password, { 
                ACL: userACL,
                email: email,
            }).then(function(user){
                if(App.Collections.order.length){
                    App.router.navigate("order", {trigger: true});
                } else {
                    that.showFind("Welcome to herbside!");
                }
                App.initUser();
            }, function(error) {
                console.log(error); 
                that.$(".message").html(error.message);
                $("#signup-button").removeAttr("disabled");
            });
        },
        login: function(e){
            if (e) { e.preventDefault(); }
            this.$("#login-button").attr("disabled", "disabled");
            var that = this;
            var username = this.$("#email-input").val();
            var password = this.$("#password-input").val();
            Parse.User.logIn(username, password, {
                success: function (user) {
                    App.initUser();
                    if(App.Collections.order.length){
                        App.router.navigate("order", {trigger: true});
                    } else {
                        that.showFind("Welcome back");
                    }
                },
                error: function (user, error) {
                    console.log(error); 
                    that.$("#login-button").removeAttr("disabled");
                    that.$(".message").html("Wrong username or password. Try again?");
                }
            });
        },
        reset: function(){
            var that = this;
            this.$("#reset-button").attr("disabled", "disabled");
            var email = $("#email-input").val();
            Parse.User.requestPasswordReset(email, {
                success: function() {
                    that.showFind("Check your email for the password reset link!");
                },
                error: function(error) {
                    that.$(".message").html(error.message);
                }
            });
        },
        getNotified: function(){
            this.$("#notify-button").attr("disabled", "disabled");
            var that = this;
            console.log('notifying you!!');///c
            var PreUser = Parse.Object.extend("preUser");
            var preUser = new PreUser();
            preUser.save({
                email: $('#email-input').val(), 
                zip: App.location.zip,
                location: App.location.geo, 
                address: App.location.address
            }, {
                success: function(object) {
                    that.$(".message").html("You are now in the loop"); 
                },
                error: function(model, error) {
                    that.$(".message").html("Something went wrong, please try again");
                    that.$("#reset-button").attr("disabled", false);
                }
            });
        }
    });

    App.Views.Home = Parse.View.extend({
        initialize: function(){
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive('#home-link');
            });
            App.on('app:update', function () {
                this.renderExamples();
            }, this);
        },
        renderExamples: function(){
            this.collection.order = "top";
            this.collection.sort();
            console.log(this.collection);///c
            var featured = this.collection.byFilter(["Featured"]);
            this.$('.featured-count span').html(featured.length);
            if(featured[0]){
                var featuredImage = featured[0].attributes.fileThumb._url;
                this.$(".home-category:first").css('background-image', 'url('+featuredImage+')');   
            } else {
                this.$(".home-category:first").hide();
            }
            var specials = this.collection.byFilter(["Special"]);
            this.$('.specials-count span').html(specials.length);
            if(specials[0]){
                var specialImage = featuredImage === specials[0].attributes.fileThumb._url ? specials[1].attributes.fileThumb._url : specials[0].attributes.fileThumb._url;
                this.$(".home-category:eq(1)").css('background-image', 'url('+specialImage+')');
            } else {
                this.$(".home-category:eq(1)").hide();
            }
            this.$('.everything-count span').html(this.collection.length);
            if(this.collection.models[0]){
                var everythingImage = _.find(this.collection.models, function(item){
                    return item.attributes.fileThumb._url !== specialImage && item.attributes.fileThumb._url !== featuredImage;
                }).attributes.fileThumb._url;
                this.$(".home-category:eq(2)").css('background-image', 'url('+everythingImage+')');
            }
        },
        events: {
            "click [title='Everything']":"everything",
            "click [title='Featured']":"featured",
            "click [title='Specials']":"specials"
        },
        everything: function(){
            App.router.navigate('home/everything', {trigger: true});
        },
        featured: function(){
            App.router.navigate('home/featured', {trigger: true});
        },
        specials: function(){
            App.router.navigate('home/specials', {trigger: true});
        }
    });

    App.Views.List = Parse.View.extend({
        el: '#list',
        initialize: function(){
            _.bindAll(this, 'renderItems', 'renderItem');
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive();
            });

            this.visibleCollection = new App.Collections.Items(this.collection.models);
            this.visibleCollection.on("reset", this.reset, this);
            this.initFilters = [];

            App.on('app:update', function () {
                this.visibleCollection.reset(this.collection.models);
                console.log('this.visibleCollection reset ===');
                console.log(this.visibleCollection);
            }, this);
            App.test = this;
        },
        reset: function(){
            console.log('RESET TRIGGERED!!!');
            this.gridRendered = false;
            this.itemQue = 0;
            this.$(".items").empty();
            this.renderItems();
            return this;
        },
        clearFilters: function(){
            this.initFilters = [];
            this.$(".filter-option.active").removeClass("active");
        },
        clearNewFilters: function(){
            this.newFilters = [];
            this.filterBy();
            this.$(".filter-option.active").removeClass("active");
        },
        filterBy: function(filters){
            this.newFilters = filters;
            var currentFilters = _.flatten(_.compact(this.initFilters.concat(filters)));
            console.log('currentFilters = '+currentFilters);
            this.visibleCollection.reset(this.collection.byFilter(currentFilters));
            console.log('new visible collection = ');
            console.log(this.visibleCollection);
        },
        events: {
            "click .back":"back",
            "click .clear-filters":"clearNewFilters",
            "click .more-section":"renderItems",
            "click .new":"sortNew",
            "click .top":"sortTop",
            "click .price":"sortPrice",
            "click .filter-menu-button":"showFilterMenu",
            "click .filter-option":"filter"
        },
        back: function(){
            console.log('back triggered with ===!');///c
            console.log(this.backRoute);///c
            console.log(this.backPage);///c
            App.router.back(this.backRoute, this.backPage);
        },
        updateListTitle: function(title){
            this.$(".list-title").html(title);
            this.$('.sort-option').stop().fadeIn();
        },
        sortNew: function(e){
            this.sort('new');
            this.updateListTitle("Newest");
            this.$('.new').hide();
        },
        sortTop: function(e){
            this.sort('top');
            this.updateListTitle("Top Rated");
            this.$('.top').hide();
        },
        sortPrice: function(e){
            this.sort('price');
            this.updateListTitle("Lowest $$");
            this.$('.price').hide();
        },
        sort: function(sortOrder){
            this.visibleCollection.order = sortOrder;
            this.visibleCollection.sort();
            this.reset();
        },
        showFilterMenu: function(){
            this.$("#filter-list").popup("open");
        },
        filter: function(e){
            $(e.target).toggleClass("active");
            var filters = [];
            this.$(".filter-option.active").each(function(){
                filters.push($(this).text());
            });
            this.filterBy(filters);
        }
    });

    App.Views.ListHome = App.Views.List.extend({
        showTopEverything: function(){
            this.$(".title").html("Everything");
            this.clearFilters();
            this.filterBy();
            this.sortTop();
        },
        showTopFeatured: function(){
            this.$(".title").html("Nominees");
            this.clearFilters();
            this.initFilters.push("Featured");
            this.filterBy();
            this.sortTop();
        },
        showTopSpecials: function(){
            this.$(".title").html("Specials");
            this.clearFilters();
            this.initFilters.push("Special");
            this.filterBy();
            this.sortTop();
        },
        renderItems: function(){
            var remaining = this.visibleCollection.length-this.itemQue;
            if (remaining <= 10 ) {
                var perPage = remaining;
                if (this.newFilters){
                    this.$(".more-section > span").html('Clear filters');
                    this.$(".more-section").addClass('clear-filters');
                    this.$(".more-section").show();
                } else {
                    this.$(".more-section").hide();
                }
            } else {
                var perPage = 10;
                this.$(".more-section > span").html('View more');
                this.$(".more-section").removeClass('clear-filters');
                this.$(".more-section").show();
            }
            while (perPage > 0) {
                this.renderItem();
                perPage--;
            }
        },
        renderItem: function(){
            var item = new App.Views.ItemProfile({model: this.visibleCollection.models[this.itemQue]});
            this.$(".items").append(item.render().el);
            item.$(".item-title").prepend('#'+(this.itemQue+1)+'. ');
            this.itemQue++;
            return this;
        },
        back: function(){
            App.router.back("home", "#home");
        }
    });

    App.Views.ListThumbs = App.Views.List.extend({
        showCategory: function(category){
            console.log(category);
            this.$(".title").html(category[category.length-1]);
            this.clearFilters();
            this.initFilters.push(category);
            this.filterBy();
        },
        renderItems: function(){
            var remaining = this.visibleCollection.length-this.itemQue;
            if (remaining <= 30 ) {
                var perPage = remaining;
                if (this.newFilters){
                    this.$(".more-section > span").html('Clear filters');
                    this.$(".more-section").addClass('clear-filters');
                    this.$(".more-section").show();
                } else {
                    this.$(".more-section").hide();
                }
            } else {
                var perPage = 30;
                this.$(".more-section > span").html('View more');
                this.$(".more-section").removeClass('clear-filters');
                this.$(".more-section").show();
            }
            while (perPage > 0) {
                this.renderItem();
                perPage--;
            }
        },
        renderItem: function(item){
            var item = new App.Views.ItemThumb({model: this.visibleCollection.models[this.itemQue]});
            if (this.gridRendered) {
                this.$(".ui-block-b:last").html(item.render().el);
                this.gridRendered = false;
            } else {
                this.$(".items").append('<div class="ui-grid-a"><div class="ui-block-a"></div><div class="ui-block-b"></div></div>');
                this.$(".ui-block-a:last").html(item.render().el);
                this.gridRendered = true;
            }
            this.itemQue++;
            return this;
        }
    });

    App.Views.MenuListThumbs = Parse.View.extend({
        initialize: function(){
            _.bindAll(this, 'renderItem');
        },
        render: function(){
            this.$el.html("");
            var categories = this.collection.getCategories();
            _.each(categories, function(category){
                this.$el.append('<div class="list-header"><div class="list-title">'+category+'</div><div class="options"><a class="outline-btn view" title="'+category+'">More</a></div></div>');
                
                var itemsByCategory = this.collection.byCategory([category]);
                var i = 0;
                while (i <= Math.min(6-1,itemsByCategory.length-1)) {
                    this.renderItem(itemsByCategory[i]);
                    i++;
                }
                this.gridRendered = false;
            }, this);
            return this;
        },
        renderItem: function(item){
            var item = new App.Views.ItemThumb({model: item});
            if (this.gridRendered) {
                this.$(".ui-block-b:last").html(item.render().el);
                this.gridRendered = false;
            } else {
                this.$el.append('<div class="ui-grid-a"><div class="ui-block-a"></div><div class="ui-block-b"></div></div>');
                this.$(".ui-block-a:last").html(item.render().el);
                this.gridRendered = true;
            }
            this.itemQue++;
            return this;
        },
        events: {
            "click .view":"openList"
        },
        openList: function(e){
            if (!this.store) {
                var filters = $(e.target).attr("title");
            } else {
                var filters = this.store.attributes.link +'+'+ $(e.target).attr("title");
            }
            App.router.navigate('browse/'+filters, {trigger: true});
        }
    });

    App.Views.Item = Parse.View.extend({
        initialize: function() {            
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive();
            });
        },
        template: _.template($("#item-profile-template").html()),
        events: {
            "click .back":"back"
        },
        back: function(){
            App.router.back(this.backRoute, this.backPage);
        },
        renderItem: function(storeLink, itemName){
            this.model = this.collection.getItemByName(itemName);
            if (this.model) {
                var profile = new App.Views.ItemProfile({model:this.model});
                this.$(".profile-container").html(profile.render().el);
                profile.showFull();
                profile.profileBlock = true;
                profile.checkStore();
            } else {
                console.log('item not available!');
                App.router.navigate(storeLink, {trigger: true});
            }
            return this;
        }
    });


    App.Views.ItemProfile = Parse.View.extend({
        template: _.template($('#item-profile-template').html()),
        initialize: function(){
            _.bindAll(this, 'scrollTo');

            this.model.on("change:amount", function(){
                if(this.model.attributes.amount > 0) {
                    console.log('amount > 0, updating AMOUNT from itemprofile change amount');
                    this.updateAmount();
                    this.$('.minus').attr("disabled", false);
                } else {
                    console.log('amount !> 0, updating RANGE from itemprofile change amount');
                    this.renderRange();
                    this.$('.minus').attr("disabled", true);
                }
            }, this);

            App.on("app:set-store",function(){
                console.log('store changed on order!!!!');
                this.checkStore();
            },this);
        },
        updateAmount: function(){
            var category = (_.intersection(this.model.attributes.category, ["Herb", "Concentrate","Wax"]).length) ? " g" : " item";
            var s = (this.model.attributes.amount>1) ? "s" : "";
            category = category + s;
            var displayAmount = this.model.attributes.amount;
            if (displayAmount > 28 && category === ' gs' && displayAmount % 28 === 0) {
                displayAmount = displayAmount / 28;
                category = ' ozs';
            }
            var text = displayAmount+category+' for '+'$'+Math.round(this.model.attributes.total)+' added';
            this.$(".item-range").html(text);
            this.$(".item-options").addClass('active');
            this.$(".add-btn.active").removeClass('active');
            this.$(".quick-add-options").find("[data-amount='" +this.model.attributes.amount+ "']").addClass('active');
        },
        renderRange: function(){
            var category = (_.intersection(this.model.attributes.category, ["Herb", "Concentrate","Wax"]).length) ? " g" : " item";
            var range = this.model.getRange();

            if(this.model.attributes.special) {
                var postSpecialMin = ' $'+Math.round(this.model.getRange().min * (1 - this.model.attributes.special));
                var postSpecialMax = ' $'+Math.round(this.model.getRange().max * (1 - this.model.attributes.special));
                var preSpecialMin = '<span>$'+this.model.getRange().min+'</span> ';
                var preSpecialMax = '<span>$'+this.model.getRange().max+'</span> ';
            } else {
                var postSpecialMin = ' $'+this.model.getRange().min;
                var postSpecialMax = ' $'+this.model.getRange().max;
                var preSpecialMin = '';
                var preSpecialMax = '';
            }

            if (range.min === range.max) {
                var text = preSpecialMin+'$'+postSpecialMin;
            } else {
                var text = preSpecialMin+postSpecialMin+' to '+preSpecialMax+postSpecialMax;
            }

            this.$(".item-range").html('<a class="add-range">1 '+category+' for '+text+'</a>');
            this.$(".add-btn.active, .item-options.active").removeClass('active');
        },
        render: function(){
            var that = this;
            $(this.el).append(this.template(this.model));
            this.renderStoreLink();
            if (App.Collections.order.getItem(this.model.id)) {
                this.updateAmount();
                this.added = true;
            } else {
                this.renderRange();
                this.$('.minus').attr("disabled", true);
                this.added = false;
            }
            this.checkStore();
            return this;
        },
        renderStoreLink: function(){
            this.store = App.Collections.stores.getStoreById(this.model.attributes.store.id);
            this.$('.store-name').html(this.store.attributes.name);
        },
        checkStore: function(){
            if (App.Collections.order.store && App.Collections.order.store.id !== this.model.attributes.store.id ){
                this.$el.fadeTo("slow", 0.6, function() {});
            } else {
                this.$el.fadeTo("slow", 1, function() {});
            }
        },
        events: {
            "click .item-title, .item-img":"showFull",
            "click .item.profile":"hideFull",
            "click .item-info":"toggleInfo",
            "vclick .plus":"plus",
            "vclick .minus":"minus",
            "vclick .add-btn":"add",
            "vclick .add-range":"plus",
            "click .store-name":"storeProfile"
        },
        scrollTo: function(){
            $("body").stop().animate({
                scrollTop: this.$el.offset().top
            }, 600);
        },
        showFull: function(){
            if (!this.profile) {
                this.$(".item").addClass("profile");
                this.scrollTo();
                this.profile = true;
                // $("body").css("overflow-y","hidden");
            }
        },
        hideFull: function(){
            if (this.profile && !this.profileBlock) {
                this.$(".item").removeClass("profile");
                this.$(".item-info").removeClass("active");
                this.profile = false;
                // $("body").css("overflow-y","scroll");
            }
        },
        toggleInfo: function(e){
            e.stopPropagation();
            this.showFull();
            this.$(".item-info").toggleClass("active");
        },
        plus: function(e){
            e.stopPropagation();
            if (this.added) {
                this.model.trigger("plus");
            } else {
                var that = this;
                App.addItem(this.model, {
                    amount: this.model.attributes.price[0].amount, 
                    total: this.model.attributes.price[0].total*(1-this.model.attributes.special)
                }).then(function(message){
                    that.showFull();
                    console.log(message);
                    that.added = true;
                }, function(error) {
                    console.log(error); 
                });
            }
        },
        minus: function(e){
            e.stopPropagation();
            if (this.model.attributes.amount !== this.model.attributes.price[0].amount) {
                this.model.trigger("minus");
            } else {
                var that = this;
                App.removeItem(this.model).then(function(message){
                    // that.hideFull();
                    that.added = false;
                }, function(error) {
                    console.log(error); 
                });
            }
        },
        add: function(e){
            e.stopPropagation();
            var that = this;
            if(!this.added || !$(e.target).hasClass("active")) {
                this.showFull();
                App.addItem(this.model, {
                    amount: $(e.target).data("amount"), 
                    total: $(e.target).data("total")
                }).then(function(message){
                    console.log(message);
                    that.$(".add-btn").removeClass("active");
                    $(e.target).addClass("active");
                    that.added = true;
                }, function(error) {
                    console.log(error); 
                });
            } else {
                App.removeItem(this.model).then(function(message){
                    console.log(message);
                    $(e.target).removeClass("active");
                    that.added = false;
                }, function(error) {
                    console.log(error); 
                });
            }
        },
        storeProfile: function(){
            this.hideFull();
            App.router.navigate(this.store.attributes.link, {trigger: true});
        }
    });

    App.Views.ItemThumb = Parse.View.extend({
        className: "item-thumb",
        template: _.template($('#item-thumb-template').html()),
        initialize: function(){
            this.model.on("change:amount", function(){
                if(this.model.attributes.amount > 0) {
                    this.addActive();
                    this.added = true;
                    this.updateAmount();
                } else {
                    this.removeActive();
                    this.added = false;
                }
            }, this);

            App.on("app:set-store",function(){
                this.checkStore();
            },this);
        },
        updateAmount: function(){
            var category = (_.intersection(this.model.attributes.category, ["Herb", "Concentrate","Wax"]).length) ? " g" : " item";
            var s = (this.model.attributes.amount>1) ? "s" : "";
            category = category+s;
            var displayAmount = this.model.attributes.amount;
            if (displayAmount > 28 && category === ' gs' && displayAmount % 28 === 0) {
                displayAmount = displayAmount / 28;
                category = ' ozs';
            }
            var text = displayAmount+category+' &middot; '+'$'+Math.round(this.model.attributes.total);
            this.$('.thumb-add').html(text).data("amount", this.model.attributes.amount).data("total",this.model.attributes.total);
        },
        render: function(){
            $(this.el).append(this.template(this.model));

            if (App.Collections.order.getItem(this.model.id)) {
                this.model = App.Collections.order.getItem(this.model.id);
                this.added = true;
                this.addActive();
                this.updateAmount();
            } else {
                this.added = false;
            }
            this.checkStore();
            return this;
        },
        checkStore: function(){
            if (App.Collections.order.store && App.Collections.order.store.id !== this.model.attributes.store.id ){
                this.$el.fadeTo("slow", 0.6, function() {});
            } else {
                this.$el.fadeTo("slow", 1, function() {});
            }
        },
        events: {
            "click .thumb-add":"add",
            "click": "itemProfile"
        },
        removeActive: function(){
            this.$('.thumb-add.active').removeClass("active");
        },
        addActive: function(){
            this.$('.thumb-add').addClass("active");
        },
        add: function(e){
            e.preventDefault();
            e.stopPropagation();
            var that = this;
            if(!this.added) {
                App.addItem(this.model, {
                    amount: $(e.target).data("amount"), 
                    total: $(e.target).data("total")
                }).then(function(message){
                    that.added = true;
                }, function(error) {
                    console.log(error); 
                });
            } else {
                App.removeItem(this.model).then(function(message){
                    console.log(message);
                    that.added = false;
                }, function(error) {
                    console.log(error); 
                });
            }
        },
        itemProfile: function(){
            var store = App.Collections.stores.getStoreById(this.model.attributes.store.id);
            App.router.navigate(store.attributes.link+"/"+this.model.attributes.name.split(" ").join("-"), {trigger: true});
        }
    });

    App.Views.Stores = Parse.View.extend({
        initialize: function(){
            this.reset();
            this.renderStores();
            App.on('app:update', function () {
                this.renderStores();
            }, this);
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive('#stores-link');
            });
        },
        renderStores: function(){
            var remaining = this.collection.length-this.storeQue;
            if (remaining <= 10 ) {
                var perPage = remaining;
                this.$('.more-section').hide();
            } else {
                var perPage = 10;
                this.$('.more-section').show();
            }
            while (perPage > 0) {
                this.renderStore();
                perPage--;
            }
        },
        renderStore: function(){
            var storeModel = this.collection.models[this.storeQue];
            var storeView = new App.Views.StoreThumb({model: storeModel});
            this.$(".store-list").append(storeView.render().el);
            this.storeQue++;
            return this;
        },
        events: {
            "click .more-section":"renderStores",
            "click label":"panel",
            "click .new":"sortNew",
            "click .top":"sortTop",
            "click .local":"sortLocal"
        },
        panel: function(){
            $("#panel-menu").panel("open");
        },
        reset: function(){
            this.$(".store-list").empty();
            this.storeQue = 0;
            this.renderStores();
        },


        sortNew: function(e){
            this.sort("new");
            this.$(".top, .local").removeClass("active");
            this.$(".new").addClass("active");
        },
        sortTop: function(e){
            this.sort("top");
            this.$(".local, .new").removeClass("active");
            this.$(".top").addClass("active");
        },
        sortLocal: function(e){
            this.sort("local");
            this.$(".top, .new").removeClass("active");
            this.$(".local").addClass("active");
        },
        sort: function(sortOrder){
            this.collection.order = sortOrder;
            this.collection.sort();
            this.reset();
        }
    });

    App.Views.StoreThumb = Parse.View.extend({
        initialize: function(){
            _.bindAll(this, 'render');
        },
        tagName: 'li',
        template: _.template('<a class="store-link main-font ui-btn"><%= attributes.name %></a>'),
        render: function(){
            $(this.el).append(this.template(this.model));
            return this
        },
        events: {
            "click a":"openProfile"
        },
        openProfile: function(){
            App.router.navigate(this.model.attributes.link, {trigger: true});
        }
    });

    App.Views.Store = Parse.View.extend({
        initialize: function() {            
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive('#stores-link');
            });
        },
        template: _.template($("#store-template").html()),
        initInfo: function(){
            this.$('#info').popup({
                history: false,
                overlayTheme: "a",
                shadow: false
            });
        },
        initList: function(){
            this.list = new App.Views.MenuListThumbs({
                el: this.$('.menu'),
                collection: new App.Collections.Items(_.uniq( this.model.attributes.items ,function(item){return item.id}))
            });
            this.list.store = this.model;
            this.list.render();
        },
        renderStore: function(storeLink){
            this.model = App.Collections.stores.getStoreByLink(storeLink);
            if (this.model) {
                this.$el.html(this.template(this.model));
                this.initInfo();
                this.initList();
            } else {
                console.log('store not available!');
                App.router.navigate('welcome', {trigger: true});
            }
            return this;
        },
        events: {
            "click .back":"back",
            "click .info-link":"showInfo"
        },
        back: function(){
            App.router.back(this.backRoute, this.backPage);
        },
        showInfo: function(){
            $('#info').popup("open");
        },
        reset: function(){

        }
    });

    App.Views.Browse = Parse.View.extend({
        initialize: function(){
            this.list = new App.Views.MenuListThumbs({el: this.$('.menu'),collection: this.collection});
            this.list.render();
            App.on('app:update', function () {
                this.list.render();
            }, this);

            this.$el.on("app:show", function(){
               App.Views.menu.clearActive('#browse-link');
            });
        },
        events: {

        }
    });

    App.Views.Order = Parse.View.extend({
        initialize: function(){
            this.collection.on("remove", function(itemModel){
                this.updateTotal();
                if(this.collection.length === 0) {
                    // $("#order-link").addClass("empty");
                    this.clearStore();
                }
            }, this);

            this.collection.on("add", function(itemModel){
                this.updateTotal();
                this.renderItem(itemModel);
                if(this.collection.length > 0) {
                    // $("#order-link").removeClass("empty");
                    this.$("#submit-button:hidden, .order-options:hidden, .continue:hidden").show();
                }
            }, this);

            this.collection.on("change:amount", function(){
                this.updateTotal();
            }, this);

            var that = this;
            this.$el.on("app:show", function(){
                App.Views.menu.clearActive('#order-link');
                that.$('.delete').html('x');
                that.updateTotal();
            });
        },
        resetOrder: function(options){
            this.collection.each(function(item){
                item.set("total", 0);
                item.set("amount", 0);
            }, this);
            if(options && options.silent){
                this.collection.reset();
            } else {
                this.collection.remove(this.collection.models);
            }
            this.$('.order-item').remove();
            this.clearStore();
            return this;
        },
        clearStore: function(){
            this.$("#submit-button, .order-options, .continue, .cash-select, .debit-select, .credit-select").fadeOut();
            this.$('.order-store').html("");
            this.collection.store = undefined;
        },
        setStore: function(storeModel){
            console.log('settting store!!!!');
            console.log(storeModel);
            this.collection.store = storeModel;
            this.$('.order-store').html(this.collection.store.attributes.name);
            if(storeModel.attributes.credit){
                this.$(".credit-select").show();
                this.$(".credit-select").trigger("click");
            } else {
                this.$(".credit-select").hide();
            }
            if(storeModel.attributes.debit){
                this.$(".debit-select").show();
                this.$(".debit-select").trigger("click");
            } else {
                this.$(".debit-select").hide();
            }
            if(storeModel.attributes.cash){
                this.$(".cash-select").show();
                this.$(".cash-select").trigger("click");
            } else {
                this.$(".cash-select").hide();
            }
        },
        renderItem: function(itemModel){
            var orderItem = new App.Views.OrderItem({model:itemModel});
            this.$(".order-list").append(orderItem.render().el);
        },
        events: {
            "click .order-payment a":"selectPaymentType",
            "click .submit":"submitOrder",
            "click .store-link, .continue":"continue",
            "click .back":"back"
        },
        selectPaymentType: function(e){
            console.log(e);
            this.payment = $(e.target).attr("title");
            this.$(".order-payment").children().removeClass("active");
            $(e.target).addClass("active");
        },
        updateTotal: function(){
            if (this.collection.updateTotal()) {
                $(".menu-order-total").html('$'+Math.round(this.collection.total));
                var newTotal = 'Total: <span>$'+this.collection.total.toFixed(2);+'</span>';
                if (this.collection.total >= this.collection.store.attributes.min) {
                    this.enableOrder();
                } else {
                    this.disableOrder();
                }
            } else {
                $(".menu-order-total").html('$0');
                var newTotal = '<div class="main-font pad" style="text-align:center;">Empty!</div>';
            }
            this.$('.order-total').html(newTotal);
        },
        enableOrder: function(){
            this.$('#submit-button').addClass("submit green-btn main-font").removeClass("store-link purple-btn").html("Submit Order");
        },
        disableOrder: function(){
            this.$('#submit-button').removeClass("submit green-btn main-font").addClass("store-link purple-btn").html("<span>Min order $"+this.collection.store.attributes.min+"<span>");
        },
        submitOrder: function(){
            this.$("#submit-button").attr("disabled",true);
            this.$("#submit-button").append('<div class="signal"></div>');
            var items = [];
            _.each(this.collection.models, function(item){
                //[Amount, Total Cost, Name, ID, Category]
                items.push([item.attributes.amount, item.attributes.total, item.attributes.name, item.id, item.attributes.category]);
            });
            console.log(items);
            var that = this;
            App.submitOrder({
                items: items,
                // delivery: this.collection.delivery,
                // pickup: this.collection.pickup,
                total: this.collection.total,
                amount: this.collection.amount,
                payment: this.payment,
                address: this.$("#address-input").val(),
                note: this.$("#note-input").val(),
                storeId: this.collection.store.id
            }).then(function(order){
                console.log(that.payment);///c
                console.log(order);///c
                App.Views.summary.render();
                that.resetOrder({silent: true});
                App.Views.summary.initMenu();
                App.Views.notification.showMessage('Order placed, look out for a text!');
                App.router.navigate("summary", {trigger: true});
                that.$("#submit-button").removeAttr("disabled");
                that.$("#submit-button > .signal").remove();
            }, function(error) {
                console.log(error);
                App.Views.notification.showMessage(error.message);
                that.$("#submit-button").removeAttr("disabled");
                that.$("#submit-button > .signal").remove();
            });
        },
        continue: function(){
            if (this.collection.store) {
                App.router.navigate(this.collection.store.attributes.link, {trigger: true});
            } else {
                this.back();
            }
        },
        back: function(){
            App.router.back(this.backRoute, this.backPage);
        }
    });

    App.Views.OrderItem = Parse.View.extend({
        initialize: function(){
            this.model.on("remove", function(){
                this.model.off("plus", this.plusItem, this);
                this.model.off("minus", this.plusItem, this);
                this.model.off("change:amount", this.selectAmount, this);
                this.model.off("remove");
                this.remove();
            }, this);

            this.model.on("change:amount", this.selectAmount, this);
            this.model.on("plus", this.plusItem, this);
            this.model.on("minus", this.minusItem, this);
        },
        template: _.template($("#order-item-template").html()),
        className: "order-item",
        tagName: "li",
        render: function(){
            $(this.el).append(this.template(this.model));
            if(this.model.attributes.fileThumb) {
                $(this.el).css('background-image', 'url('+this.model.attributes.fileThumb._url+')');
            }            
            this.$('.select-quantity').val(this.model.attributes.amount);
            this.updateSelectedBase();
            return this;
        },
        events: {
            "change select":"updateAmount",
            "vclick .plus":"plusItem",
            "vclick .minus":"minusItem",
            "click .profile-link":'itemProfile',
            "click .delete":"showRemove",
            "click .remove":"removeItem"
        },
        selectAmount: function(){
            console.log(this.model.attributes.amount);
            this.$('.select-quantity').val(this.model.attributes.amount);
            this.updateSelectedBase();
        },
        updateSelectedBase: function(){
            this.selectedBase = this.$('.select-quantity').find(":selected");
            if (this.selectedBase.hasClass('temp')) {
                this.selectedBase = this.selectedBase.prev();
            }
        },
        updateAmount: function(){
            this.model.set('total', this.$('.select-quantity option:selected').data("total"));
            this.model.set('amount', parseFloat(this.$('.select-quantity').val()));
            this.hideRemove();
        },
        plusItem: function(){
            var newAmount = this.model.attributes.amount + parseFloat(this.selectedBase.val());
            var newTotal = this.model.attributes.total + this.selectedBase.data("total");
            var next = this.$('.select-quantity').find(":selected").next();
            // if ( new amount < the next option amount &  the new total is less than the next option total or there are no more options ) 
            if ( newAmount < next.val() & newTotal < next.data("total") | !next.length ){
                this.$('.select-quantity > option.temp').remove();
                var category = (_.intersection(this.model.attributes.category, ["Herb", "Concentrate","Wax"]).length) ? ' gs' : ' items';
                //convert to ozs
                var displayAmount = newAmount;
                if (newAmount > 28 && category === ' gs' && newAmount % 28 === 0) {
                    displayAmount = newAmount / 28;
                    category = ' ozs';
                }
                this.selectedBase.after('<option value='+newAmount+' data-total='+newTotal+' class="temp">'+displayAmount+category+' for $'+Math.round(newTotal)+'</option>');
                this.$('.select-quantity').val(newAmount);
                this.updateAmount();
            } else {
                this.selectedBase = this.$('.select-quantity').find(":selected").next();
                this.$('.select-quantity').val(this.selectedBase.val());
                this.$('.select-quantity > option.temp').remove();
                this.updateAmount();
            }
        },
        minusItem: function(){
            if (this.$('.select-quantity').prop("selectedIndex") < 1) {
                this.$('.select-quantity').prop("selectedIndex",0);
            } else {
                this.$('.select-quantity').prop("selectedIndex",this.$('.select-quantity').prop("selectedIndex")-1);
            }
            this.updateAmount();
            this.updateSelectedBase();
            this.$('.select-quantity > option.temp').remove();
        },
        itemProfile: function(){
            var store = App.Collections.stores.getStoreById(this.model.attributes.store.id);
            App.router.navigate(store.attributes.link+"/"+this.model.attributes.name.split(" ").join("-"), {trigger: true});
        },
        hideRemove: function(){
            this.$('.delete').html('x');
        },
        showRemove: function(){
            this.$('.delete').html('<a class="remove small-font outline-btn">x</a>');
        },
        removeItem: function(){
            App.removeItem(this.model);
        }
    });


    App.Views.Summary = Parse.View.extend({
        id: "summary",
        initialize: function(){
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive("#menu-panel-link");
            });
        },
        render: function(){
            $('#summary > ul > li > a.store-link').html(App.Collections.order.store.attributes.name+'<span class="store-text"></span><span href="'+App.Collections.order.store.attributes.phone+'"class="flaticon-phone right-icon green"></span>');
            $('.summary-list').html("");
            var i = 0;
            var selected = App.Views.order.$('.select-quantity').find(":selected");
            App.Collections.order.each(function(item){
                $('.summary-list').append('<div>'+item.attributes.name+'</div><div class="purple">'+selected[i].text+'</div>');
                i++;
            });
            $('.summary-list').append('<div>Total: $'+App.Collections.order.total.toFixed(2)+'</div>');
        },
        initMenu: function(){
            $("#summary-link").show();
        },
        clearMenu: function(){
            $("#summary-link").hide();
        },
        events: {
            "click #cancel":"cancel",
            "click .back":"back"
        },
        cancel: function(){
            this.back();
        },
        back: function(){
            App.router.back(this.backRoute, this.backPage);
        }
    });

    App.Views.Settings = Parse.View.extend({
        initialize: function(){
            var that = this;
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive("#menu-panel-link");
               that.setUser();
            });
        },
        setUser: function(){
            this.$("#update-name-input").val(App.user.attributes.name);
            // this.$("#update-phone-input").val(App.user.attributes.phone);
            this.$("#update-email-input").val(App.user.attributes.username);
        },
        events: {
            "change #update-name-input":"saveAccount",
            "click #logout-link":"logout",
            "click .save-button":"saveAccount",
            "click #verify-settings-link":"verify",
            "click .back":"back"
        },
        logout: function(){
            var that = this;
            console.log('logout triggered');///c
            $.when(Parse.User.logOut()).then(function () {
                App.initUser();
                App.router.back(that.backRoute, that.backPage);
            });
        },
        saveAccount: function(){
            this.$(".save-button").attr("disabled", true);
            var that = this;
            App.user.set("name", this.$("#update-name-input").val() || App.user.attributes.name);
            App.user.set("username", this.$("#update-email-input").val() || App.user.attributes.username);
            App.user.set("email", this.$("#update-email-input").val() || App.user.attributes.username);
            App.user.set("password", this.$("#update-password-input").val());
            App.user.save(null,{
                success: function(user) {
                    App.Views.notification.showMessage('Settings saved');
                    that.$(".save-button").removeAttr("disabled");
                },
                error: function(user, error) {
                    App.Views.notification.showMessage(error.message);
                    that.$(".save-button").removeAttr("disabled");
                }
            });
        },
        verify: function(){
            App.router.navigate("verify", {trigger: true});
        },
        back: function(){
            App.router.back(this.backRoute, this.backPage);
        }
    });

    App.Views.Verify = Parse.View.extend({
        initialize: function() {
            var that = this;
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive("#menu-panel-link");
            });
        },
        showVerifyPhone: function(message){
            this.$(".verify-input-container").html("<p class='pad'>Step 1/3 Contact Info: To keep you in the loop, we need your full name and phone number.</p>");
            this.$(".verify-input-container").append('<div data-role="controlgroup" data-type="horizontal"><label>Full Name</label><input type="text" name="name" id="name-input" class="main-font main-input" value="" placeholder="ex ~ Chris Smith"><label>Phone</label><input type="text" id="phone-input" name="phone" value="" placeholder="ex ~ 4151235555" class="main-link main-font" autocomplete="off"></div>');
            this.$(".welcome-options").html('<p class="message gray"></p><button id="verify-button" class="ui-btn green-btn main-link main-font larger-font bottom-link">Continue</button>');
            this.$(".message").html(message || "");
            if(App.user.attributes.phone){
                this.$("#phone-input").val(App.user.attributes.phone);
            }
            if(App.user.attributes.name){
                this.$("#name-input").val(App.user.attributes.name);
            }
        },
        showVerifyCode: function(){
            this.$(".verify-input-container").html("<p class='pad'>Verification code sent to your phone. <br><br><a class='try-again'>Didn't get the message? Try again.</a></p>");
            this.$(".verify-input-container").append('<div data-role="controlgroup" data-type="horizontal"><label>Verification Code</label><input type="text" id="verification-code-input" name="code" value="" placeholder="ex ~ 123" class="main-link main-font" autocomplete="off"></div>');
            this.$(".welcome-options").html('<p class="message gray"></p><button id="confirm-verification-code-button" class="ui-btn green-btn main-link main-font larger-font bottom-link">Confirm</button>');
        },
        showVerifyRec: function(message){
            this.$(".verify-input-container").html("<p class='pad'>Step 2/3 Recomendation: Provide your valid medical marijuana doctor recommendation or ID card.</p>");
            this.$(".verify-input-container").append('<label>Upload / Take Photo</label><input type="file" id="rec-input" class="ui-btn">');
            this.$(".welcome-options").html('<p class="message gray"></p><button id="rec-continue-button" class="ui-btn green-btn main-link main-font larger-font bottom-link">Next</button>');
            this.$(".message").html(message || "");
        },
        showVerifyId:function(message){
            this.$(".verify-input-container").html("<p class='pad'>Step 3/3 CA Identification: Drivers license, identification card or passport.</p>");
            this.$(".verify-input-container").append('<label>Upload / Take Photo</label><input type="file" id="id-input" class="ui-btn">');
            this.$(".welcome-options").html('<p class="message gray"></p><button id="id-continue-button" class="ui-btn green-btn main-link main-font larger-font bottom-link">Finish</button>');
            this.$(".message").html(message || "");
        },
        events: {
            "click .back":"back",
            "click #verify-button":"sendPhoneVerificationCode",
            "click .try-again":"showVerifyPhone",
            "click #confirm-verification-code-button":"confirmPhone",
            "click #rec-continue-button":"uploadRec",
            "click #id-continue-button":"uploadId",
            "click .exit":"exit"
        },
        sendPhoneVerificationCode: function(){
            var that = this;
            this.$("#phone-input, #verify-button").attr("disabled", true);
            if(!this.$("#name-input").val()){
                this.$(".message").html('Enter your name.').fadeIn();
                this.$("#phone-input, #verify-button").attr("disabled", false);
            } else if(this.$("#phone-input").val().length < 10){
                this.$(".message").html('Enter a valid phone number.').fadeIn();
                this.$("#phone-input, #verify-button").attr("disabled", false);
            } else {
                Parse.Cloud.run("sendVerificationCode", {phone:this.$("#phone-input").val()}, {
                    success: function (results) {
                        App.user.set("name", that.$("#name-input").val());
                        that.phone = that.$("#phone-input").val();
                        App.router.navigate("verify/code", {trigger: true});
                        // App.user.fetch();
                        that.$("#phone-input, #verify-button").attr("disabled", false);
                    },
                    error: function (error) {
                        that.$(".message").html(error.message).fadeIn();
                        that.$("#phone-input, #verify-button").attr("disabled", false);
                    }
                });
            }
        },
        confirmPhone: function(){
            var that = this;
            this.$("#verification-code-input, #confirm-verification-code-button").attr("disabled",true);
            if(this.$("#verification-code-input").val()){
                Parse.Cloud.run("verifyPhone", {phone:this.phone, phoneVerificationCode:this.$("#verification-code-input").val()}, {
                    success: function (results) {
                        console.log(results);///c
                        App.user.set("phone", that.phone);
                        App.router.navigate("verify/rec", {trigger: true});
                        that.$("#verification-code-input, #confirm-verification-code-button").removeAttr("disabled");
                    },
                    error: function (error) {
                        console.log(error);///c
                        that.$(".message").html(error.message).fadeIn();
                        that.$("#verification-code-input, #confirm-verification-code-button").removeAttr("disabled");
                    }
                });
            } else {
                this.$(".message").html('Enter verification code.').fadeIn();
                this.$("#verification-code-input, #confirm-verification-code-button").removeAttr("disabled");
            }
        },
        uploadRec: function(){
            var that = this;
            var upload = this.$("#rec-input")[0];
            this.$("#rec-continue-button, #rec-input").attr("disabled",true);
            if (upload.files.length > 0) {
                var image = upload.files[0];
                var name = "rec.jpg";
                var file = new Parse.File(name, image);
                App.user.set("recFile",file);
                App.user.save().then(function(rec){
                    that.$("#rec-continue-button, #rec-input").removeAttr("disabled");
                    App.router.navigate("verify/id", {trigger: true});
                }, function(error){
                    that.$("#rec-continue-button, #rec-input").removeAttr("disabled");
                    that.$(".message").html(error.message).show();
                });
            } else {
                this.$(".message").html('Upload your recommendation.').fadeIn();
                that.$("#rec-continue-button, #rec-input").removeAttr("disabled");
            }
        },
        uploadId: function(){
            var that = this;
            var upload = this.$("#id-input")[0];
            this.$("#id-continue-button, #id-input").attr("disabled",true);
            if (upload.files.length > 0) {
                var image = upload.files[0];
                var name = "id.jpg";
                var file = new Parse.File(name, image);
                App.user.set("idFile",file);
                App.user.save().then(function(id){
                    that.$("#id-continue-button, #id-input").removeAttr("disabled");
                    that.exit();
                }, function(error){
                    that.$("#id-continue-button, #id-input").removeAttr("disabled");
                    that.$(".message").html(error.message).show();
                });
            } else {
                this.$(".message").html('Upload your ID.').fadeIn();
                this.$("#id-continue-button, #id-input").removeAttr("disabled");
            }
        },
        back: function(){
            window.history.back();
        },
        exit: function(){
            App.router.back(this.exitRoute, this.exitPage);
        }
    });


    App.Views.Review = Parse.View.extend({
        initialize: function(){
            var that = this;
            this.$el.on("app:show", function(){
                if(that.reviewable){
                    that.reset();
                } else {
                    App.getOrders().then(function(orders){
                        that.collection.reset(orders);
                        that.reviewable = App.Collections.recentOrders.getReviewable();
                        that.reset();
                    });
                }
                App.Views.menu.clearActive("#menu-panel-link");
            });
        },
        reset: function(){
            this.currentIndex = 0;
            this.renderReview();
        },
        renderReview: function(){
            if(this.reviewable[this.currentIndex]) {
                this.current = this.reviewable[this.currentIndex];
                this.$(".review-name").html(this.current.name);
                this.$(".review-store").html(this.current.storeName);
                this.$(".item-img").css("background-image", 'url('+this.collection.getItem(this.current.itemId).attributes.fileThumb._url+')');
                this.updateCount();
                this.$el.fadeIn();
            } else if(!this.reviewable.length) {
                App.router.navigate("home", {trigger: true});
                App.Views.notification.showMessage('Nothing to review...');
            } else {
                this.submitReview();
            }
            return this;
        },
        updateCount: function(){
            var reviewNumber = this.currentReview+1;
            this.$("h2").html('Rating '+(this.currentIndex+1)+' / '+this.reviewable.length)
        },
        initMenu: function(){
            $("#review-link").show();
            $("#menu-panel-link").children().addClass("green");
        },
        clearMenu: function(){
            $("#review-link").hide();
            $("#menu-panel-link").children().removeClass("green");
        },
        events: {
            "click .back":"back",
            "click .review-options > a":"setReview",
            "click .exit":"exit"
        },
        back: function(){
            if(this.currentIndex === 0) {
                this.exit();
            } else {
                this.$el.hide();
                this.currentIndex--;
                this.renderReview();                
            }
        },
        setReview: function(e){
            this.$(".main-link").attr("disabled", "disabled");
            this.$el.hide();
            this.current.review = ($(e.target).attr("title"));
            this.next();
        },
        exit: function(){
            App.router.back(this.backRoute, this.backPage);
            this.$el.hide();
        },
        next: function(){
            this.currentIndex++;
            this.renderReview();
            this.$(".main-link").removeAttr("disabled");
        },
        submitReview: function(){
            App.Views.notification.showMessage('Review submitted.');
            this.clearMenu();
            this.exit();

            var that = this;
            App.reviews = this.reviewable;
            App.submitReview({
                reviews: this.reviewable
            }).then(function(review){
                App.getOrders().then(function(orders){
                    that.collection.reset(orders);
                    that.reviewable = App.Collections.recentOrders.getReviewable();
                });
            }, function(error) {
                that.reset();
                App.Views.notification.showMessage(error.message);
            });
        }
    });

    App.Views.Notification = Parse.View.extend({
        initialize: function() {
            // this.collection.on("change:amount", function(){
            //     this.showMessage('Order updated!');
            // }, this);

            this.collection.on("remove", function(itemModel){
                this.showMessage(itemModel.attributes.name+' removed from order!');
            }, this);

            this.collection.on("add", function(itemModel){
                this.showMessage(itemModel.attributes.name+' added to your order!');
            }, this);
        },
        events: {
            "click .close":"close",
            "click .notification-message":"order"
        },
        showMessage: function(message){
            this.$(".notification-message").html(message);
            this.$el.stop().animate({opacity:"show", height: "show"}, "slow");
            var that = this;
            this.closeTimer();
        },
        closeTimer: _.debounce(function(){ this.close(); }, 3000),
        close: function(){
            this.$el.stop().animate({opacity:"hide",height:"hide"},"slow");
        },
        order: function(){
            App.router.navigate("order", {trigger: true});
        }
    });

    App.Views.Menu = Parse.View.extend({
        initialize: function() {
            var that = this;
            App.Collections.order.on("change:amount add remove", function(){
                that.$("#order-link").children().stop().addClass("hulk-out");
                that.orderLinkTimer();
            });
        },
        orderLinkTimer: _.debounce(function(){ this.$("#order-link").children().removeClass("hulk-out"); }, 3000),
        events: {
            "click #home-link":"home",
            "click #browse-link":"browse",
            "click #stores-link":"stores",
            "click #order-link":"order",
            "click #menu-panel-link":"panel"
        },
        clearActive: function(tab){
            $(".main-tab").removeClass("active");
            if(tab){$(tab).addClass("active");};
        },
        home: function(e){
            App.router.navigate("home", {trigger: true});
        },
        browse: function(e){
            App.router.navigate("browse", {trigger: true});
        },
        stores: function(e){
            App.router.navigate("stores", {trigger: true});
        },
        order: function(e){
            App.router.navigate("order", {trigger: true});
        },
        panel: function(e){
            $("#panel-menu").panel("open");
        }
    });

    App.Views.Panel = Parse.View.extend({
        initialize: function(){
            _.bindAll(this,"showUserLinks","showPublicLinks");
            App.on('app:update', function (zip) {
                this.hideZipEnter();
            }, this);
        },
        showUserLinks: function(){
            this.$("#login-link,#signup-link").hide();
            this.$("#invite-link,#user-link,#settings-link").show();
            this.$("#user-link").html(Parse.User.current().getUsername());
        },
        showPublicLinks: function(){
            this.$("#invite-link,#user-link,#settings-link").hide();
            this.$("#login-link,#signup-link").show();
        },
        events: {
            "click .delivery-link":"delivery",
            "click .pickup-link":"pickup",
            "keypress .zip-input":"showZipEnter",
            "click #user-location-button": "findMe",
            "click #find-zip-button": "findZip",
            "click #signup-link":"signup",
            "click #login-link":"login",
            "click #settings-link":"settings",
            "click #verify-link":"verify",
            "click #review-link":"review"
        },
        delivery: function(){
            $(".pickup-link").removeClass("active");
            $(".delivery-link").addClass("active");
        },
        pickup: function(){
            $(".delivery-link").removeClass("active");
            $(".pickup-link").addClass("active");
        },
        showZipEnter: function(){
            this.$("#find-zip-button").fadeIn();
        },
        hideZipEnter: function(){
            this.$("#find-zip-button").fadeOut();
        },
        findMe: function(){
            var that = this;
            this.$(".zip-input, #find-zip-button, #user-location-button").attr("disabled",true);
            App.getGeoLocation().then(function(){
                that.$(".zip-input, #find-zip-button, #user-location-button").removeAttr("disabled");
                that.hideZipEnter();
                that.$el.panel("close");
            }, function(error) {
                console.log(error);
                that.$(".message").html(error);
                that.$(".zip-input, #find-zip-button, #user-location-button").removeAttr("disabled");
            });
        },
        findZip: function(){
            var that = this;
            this.$(".zip-input, #find-zip-button, #user-location-button").attr("disabled",true);
            App.getZipLocation(this.$(".zip-input").val()).then(function(){
                that.$(".zip-input, #find-zip-button, #user-location-button").removeAttr("disabled");
                that.hideZipEnter();
                that.$el.panel("close");
            }, function(error) {
                console.log(error);
                that.$(".message").html(error);
                that.$(".zip-input, #find-zip-button, #user-location-button").removeAttr("disabled");
            });            
        },
        signup: function(){
            App.router.navigate("signup", {trigger:true});
        },
        login: function(){
            App.router.navigate("login", {trigger:true});
        },
        settings: function(){
            App.router.navigate("settings", {trigger:true});
        },
        verify: function(){
            App.router.navigate("verify", {trigger:true});
        },
        review: function(){
            App.router.navigate("review", {trigger:true});
        }
    });

    App.Router = Parse.Router.extend( {
        initialize: function() {
            $("#main-menu, #notification").toolbar();
            $("#panel-menu").panel();

            App.Views.notification = new App.Views.Notification({el: "#notification", collection: App.Collections.order});
            App.Views.menu = new App.Views.Menu({el: "#main-menu"});
            App.Views.panel = new App.Views.Panel({el: "#panel-menu"});

            App.Views.welcome = new App.Views.Welcome({el: "#welcome"});
            App.Views.item = new App.Views.Item({el: "#item", collection: App.Collections.items});
            App.Views.list = new App.Views.ListHome({el: "#list",collection: App.Collections.items});
            App.Views.thumbs = new App.Views.ListThumbs({el: "#thumbs",collection: App.Collections.items});
            App.Views.home = new App.Views.Home({el: "#home", collection: App.Collections.items});
            App.Views.stores = new App.Views.Stores({el: "#stores", collection: App.Collections.stores});
            App.Views.browse = new App.Views.Browse({el: "#browse", collection: App.Collections.items});
            App.Views.store = new App.Views.Store({el: "#store-profile"});
            App.Views.order = new App.Views.Order({el: "#order", collection: App.Collections.order});
            App.Views.settings = new App.Views.Settings({el: "#settings"});
            App.Views.verify = new App.Views.Verify({el: "#verify"});
            App.Views.summary = new App.Views.Summary({el: "#summary", collection: App.Collections.order});
            App.Views.review = new App.Views.Review({el: "#review", collection: App.Collections.recentOrders});
            
            this.on("all", function () { 
                this.backRoute = Parse.history.getFragment(); 
            }, this);

            var that = this;
            $("body").on("pagecontainerbeforeshow", function(event, ui){
                ui.toPage.trigger('app:show');
                that.backPage = ui.prevPage;
            });
        },
        /*
            Options: Parses current url hash fragment and query string into a common options objects, to be used in view initialization.
                Accepts:
                    /Herbs+Sativa-Hybrid?special=true&zip=95030
                Returns:
                    {
                        filters: ['Herbs',Sativa Hybrid'],
                        special: true,
                        zip: 95030
                    }
        */
        options: function () {
            var fragment = Parse.history.getFragment();

            var pathIndex = fragment.indexOf('/');
            var qsIndex = fragment.indexOf('?');
            if (qsIndex === -1) qsIndex = fragment.length;
            if (pathIndex === -1) pathIndex = qsIndex;
            
            var path = fragment.substring(pathIndex + 1, qsIndex);
            var qs = fragment.substring(qsIndex + 1, fragment.length)

            var options = {};
            options.filters = path ? path.split('-').join(' ').split('+') : [];
            if (qs.indexOf('&') !== -1) {
                _.each(qsIndex.split('&'), function (kvp) {
                    _addOption(options, kvp);
                });
            } else {
                _addOption(options, qs);
            }
            return options;

            function _addOption(options, kvp) {
                var kv;
                if ((kvp.indexOf('=') !== -1) && ((kv = kvp.split('=')).length === 2)) {
                    options[kv[0]] = kv[1];
                }
            }
        },
        routes: {
            "": "index",
            "welcome": "welcome",
            "home":"home",
            "home/everything": "everything",
            "home/featured": "featured",
            "home/specials": "specials",
            "browse":"browse",
            "browse/:filters":"thumbs",
            "order":"order",
            "summary":"summary",
            "signup":"signup",
            "login":"login",
            "getnotified":"getnotified",
            "settings":"settings",
            "verify":"verify",
            "verify/phone":"verify",
            "verify/code":"code",
            "verify/rec":"rec",
            "verify/id":"id",
            "review":"review",
            "summary":"summary",
            "dash":"dash",
            ":storeLink":"store",
            ":storeLink/:item":"item"
        },
        back: function(route, page){
            this.backRoute = route;
            $("body").pagecontainer("change",page,{transition:"slide",reverse: true});
            App.router.navigate(route, {trigger: false});
        },
        index: function(){
            if((function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))return true})(navigator.userAgent||navigator.vendor||window.opera)){
                App.Views.welcome.showFind();
            } else {
                window.location.replace("landing");
            }
        },
        welcome: function(){
            App.Views.welcome.showFind();
            $("body").pagecontainer("change","#welcome",{});
        },
        home: function(list){
            $("body").pagecontainer("change","#home",{});
        },
        everything: function(){
            App.Views.list.showTopEverything();
            $("body").pagecontainer("change","#list",{transition:"slide"});
        },
        featured: function(){
            App.Views.list.showTopFeatured();
            $("body").pagecontainer("change","#list",{transition:"slide"});
        },
        specials: function(){
            App.Views.list.showTopSpecials();
            $("body").pagecontainer("change","#list",{transition:"slide"});
        },
        thumbs: function(){
            console.log(this.options().filters);
            App.Views.thumbs.backRoute = this.backRoute;
            App.Views.thumbs.backPage = $("body").pagecontainer("getActivePage");
            App.Views.thumbs.showCategory(this.options().filters);
            $("body").pagecontainer("change","#thumbs",{transition:"slide"});    
        },
        store: function(storeLink){
            App.Views.store.backRoute = this.backRoute;
            App.Views.store.backPage = $("body").pagecontainer("getActivePage");
            $("body").pagecontainer("change","#store-profile",{transition:"slide"});
            // render store should contain promise, pass or fail options
            App.Views.store.renderStore(storeLink);
        },
        item: function(storeLink, item){
            App.Views.item.backRoute = this.backRoute;
            App.Views.item.backPage = $("body").pagecontainer("getActivePage");
            $("body").pagecontainer("change","#item",{transition:"pop"});
            var itemName = this.options().filters[0];
            App.Views.item.renderItem(storeLink, itemName);
        },
        browse: function(){
            $("body").pagecontainer("change","#browse",{});
        },
        order: function(){
            App.Views.order.backRoute = this.backRoute;
            App.Views.order.backPage = $("body").pagecontainer("getActivePage");
            $("body").pagecontainer("change","#order",{transition:"slide"});
        },
        summary: function(){
            App.Views.review.backRoute = this.backRoute;
            App.Views.review.backPage = $("body").pagecontainer("getActivePage");
            $("body").pagecontainer("change","#summary",{transition:"slide"});
        },
        dash: function(){
            window.location.replace("dash");
        },
        signup: function(){
            App.Views.welcome.showSignup();
            $("body").pagecontainer("change","#welcome",{});
        },
        login: function(){
            App.Views.welcome.showLogin();
            $("body").pagecontainer("change","#welcome",{});
        },
        getnotified: function(){
            App.Views.welcome.showGetNotified();
            $("body").pagecontainer("change","#welcome",{});
        },
        settings: function(){
            App.Views.settings.backRoute = this.backRoute;
            App.Views.settings.backPage = $("body").pagecontainer("getActivePage");
            $("body").pagecontainer("change","#settings",{});
        },
        verify: function(){
            App.Views.verify.exitRoute = this.backRoute;
            App.Views.verify.exitPage = $("body").pagecontainer("getActivePage");
            App.Views.verify.backRoute = this.backRoute;
            App.Views.verify.backPage = $("body").pagecontainer("getActivePage");
            App.Views.verify.showVerifyPhone();
            $("body").pagecontainer("change","#verify",{});
        },
        code: function(){
            App.Views.verify.backRoute = this.backRoute;
            App.Views.verify.backPage = $("body").pagecontainer("getActivePage");
            App.Views.verify.showVerifyCode();
            $("body").pagecontainer("change","#verify",{});
        },
        rec: function(){
            App.Views.verify.backRoute = this.backRoute;
            App.Views.verify.backPage = $("body").pagecontainer("getActivePage");
            App.Views.verify.showVerifyRec();
            $("body").pagecontainer("change","#verify",{});
        },
        id: function(){
            App.Views.verify.backRoute = this.backRoute;
            App.Views.verify.backPage = $("body").pagecontainer("getActivePage");
            App.Views.verify.showVerifyId();
            $("body").pagecontainer("change","#verify",{});
        },
        review: function(){
            // pagebeforeshow on view init?
            App.Views.review.backRoute = this.backRoute;
            App.Views.review.backPage = $("body").pagecontainer("getActivePage");
            $("body").pagecontainer("change","#review",{});  
        }
    });

    console.log('APP STARTING');///c
    App.start();

});

