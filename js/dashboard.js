Parse.$ = jQuery;
Parse.initialize("9v8IezXBqyapGNLtkyRAx9CgLtxFmdA3mb1ZiOvx", "2DuMHeA9hE8ThgpWWji6htO4Yt7npONpY4zCXPrt");

$( document ).on( "mobileinit",
    function () {
        $.mobile.ajaxEnabled = false;
        $.mobile.linkBindingEnabled = false;
        $.mobile.hashListeningEnabled = false;
        $.mobile.pushStateEnabled = false;
        $.mobile.changePage.defaults.changeHash = false;
        $.mobile.ignoreContentEnabled = true;
    }
)

var App;

$(function() {
    App = new (Parse.View.extend({
        Models: {},
        Collections: {},
        Views: {},
        initialize: function(){  
            
        },
        start: function(){
            App.Collections.items = new App.Collections.Items();
            App.Collections.orders = new App.Collections.Orders();
            App.router = new App.Router();
            Parse.history.start({});
            this.initUser();
        },
        initUser: function () {
            var that = this;
            if (Parse.User.current() && Parse.User.current().authenticated()) {
                console.log('user logged in');
                App.user = Parse.User.current();
                if(App.user.attributes.isStore) {
                    var query = new Parse.Query("Store");
                    // if they have a store assigned to their user class, get it.
                    // if none assigned, query for stores with their email and assign.
                    query.equalTo("storeUser",Parse.User.current());
                    query.first().then(function(store){
                        App.setStore(store);
                        App.Views.menu.showStoreLinks(store);
                        App.router.navigate("inventory", {trigger: true});
                    });
                } else if (App.user.attributes.isAdmin) {
                    var query = new Parse.Query("Store");
                    query.find().then(function(stores){
                        App.Collections.stores = new App.Collections.Stores(stores);
                        App.Views.admin = new App.Views.Admin({el: "#admin", collection: App.Collections.stores});
                        $("#admin-options").show();
                        App.Views.menu.showAdminLinks();
                        App.router.navigate("admin", {trigger: true});
                        console.log(App.Collections.stores);
                    });
                } else {
                    $.when(Parse.User.logOut()).then(function () {
                        that.$(".message").html('Dashboard is for business users only');
                        App.router.navigate("welcome", {trigger: true});
                    });
                }
            } else {
                console.log('user not logged in');
                App.Views.menu.showWelcomeLinks();
                App.router.navigate("welcome", {trigger: true});
            }
        },
        setStore: function(storeModel){
            App.store = storeModel;
            App.Views.editProfile.setStore(storeModel);
            App.Views.inventory.setStore(storeModel);
            App.Views.orders.setStore(storeModel);
        }
    }))({el: document.body});


    ///////// Models    
    App.Models.User = Parse.User.extend({
        className: "User",
        defaults: {

        }
    });
    App.Models.Store = Parse.User.extend({
        className: "Store",
        defaults: {
            name:"",
            description:"",
            hours:[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
            top: 0,
            topWeek: 0,
            topDays:[0,0,0,0,0,0,0],
            cash: true,
            live: false
        }
    });
    App.Models.Item = Parse.Object.extend({
        className: "Item",
        defaults: {
            name:"",
            description:"",
            top: 0,
            topWeek: 0,
            topDays:[0,0,0,0,0,0,0],
            live: false
        }
    });
    App.Models.ItemData = Parse.Object.extend({
        className: "ItemData",
        defaults: {
            inventoryAmount:0
        }
    });
    App.Models.Order = Parse.Object.extend({
        className: "Order"
    });

    /////////// Collections   
    App.Collections.Stores = Parse.Collection.extend({
        model: App.Models.Store
    });

    App.Collections.Items = Parse.Collection.extend({
        model: App.Models.Item
    });

    App.Collections.Orders = Parse.Collection.extend({
        model: App.Models.Order
    });

    // ///////// Views 
    App.Views.Welcome = Parse.View.extend({
        initialize: function() {
            this.$el.on("app:show", function(){

            });
        },
        events: {
            "click .show-login-link": "showLogin",
            "click .show-signup-link": "showSignup",
            "click .show-reset-link": "showReset",
            "click #signup-button": "signup",
            "click #login-button": "login",
            "click #reset-button": "reset"
        },
        showSignup: function(){
            App.router.navigate('signup', {trigger: false});
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
        signup: function(e){
            if (e) { e.preventDefault(); }
            this.$("#signup-button").attr("disabled", "disabled");
            var that = this;
            var email = this.$("#email-input").val();
            var password = this.$("#password-input").val();
            var userACL = new Parse.ACL(Parse.User.current());
            Parse.User.signUp(email, password, { ACL: userACL, email:email })
            .then(function(user){
                App.trigger('app:login');
                // that.showFind();
                that.$(".message").html("Thanks for signing up!");
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
                    // that.showFind("Check your email for the password reset link!");
                },
                error: function(error) {
                    that.$(".message").html(error.message);
                }
            });
        }
    });

    App.Views.Admin = Parse.View.extend({
        initialize: function() {
            this.reset();
            this.renderStores();
            this.$el.on("app:show", function(){

                App.Views.menu.clearActive("#admin-link");
            });
        },
        events: {
            "click .new-store":"newStore",
            "click .more-section":"renderStores"
        },
        newStore: function(){
            var store = new App.Models.Store();
            store.save().then(function(store){
                App.setStore(store);
                App.router.navigate("profile", {trigger: true});
            }, function(error){
                console.log(error);
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
        reset: function(){
            this.$(".store-list").empty();
            this.storeQue = 0;
            this.renderStores();
        }
    });

    App.Views.StoreThumb = Parse.View.extend({
        initialize: function(){
            _.bindAll(this, 'render');
        },
        tagName: "tr",
        template: _.template($("#store-thumb-template").html()),
        render: function(){
            $(this.el).append(this.template(this.model));
            return this
        },
        events: {
            "click a":"openProfile"
        },
        openProfile: function(){
            App.setStore(this.model);
            App.router.navigate("orders", {trigger: true});
        }
    });

    App.Views.Orders = Parse.View.extend({
        initialize: function(){
            var that = this;
            this.collection.on("reset", this.reset, this);
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive("#orders-link");
            });
        },
        reset: function(){
            this.$(".orders").empty();
            this.orderQue = 0;
            this.renderOrders();
        },
        events: {
            "click .refresh":"refresh",
            "click .more":"renderOrders"
        },
        refresh: function(){
            this.$(".refresh").attr("disabled","disabled");
            var that = this;
            this.setStore().then(function(){
                that.refreshTimer();
            });
        },
        refreshTimer: _.debounce(function(){ this.$(".refresh").removeAttr("disabled"); }, 3000),
        setStore: function(){
            var that = this;
            return Parse.Cloud.run("getStoreOrders", {storeId: App.store.id}, {
                success: function (orders) {
                    console.log(orders);
                    that.collection.reset(orders);
                    that.renderOrders();
                },
                error: function (error) {
                    console.log(error);
                }
            });
        },
        renderOrders: function(){
            console.log(this.collection);
            var remaining = this.collection.length-this.orderQue;
            if (remaining <= 10 ) {
                var perPage = remaining;
                this.$(".more").hide();
            } else {
                var perPage = 10;
                this.$(".more").show();
            }
            while (perPage > 0) {
                this.renderOrder();
                perPage--;
            }
        },
        renderOrder: function(){
            console.log(this.orderQue);
            var orderThumb = new App.Views.OrderThumb({model: this.collection.models[this.orderQue]});
            this.$(".orders").append(orderThumb.render().el);
            // $(".order-title").prepend('#'+(this.orderQue+1)+'. ');
            this.orderQue++;
            return this;
        }
    });


    App.Views.OrderOptions = Parse.View.extend({
        updateStatus: function(orderModel){
            if(orderModel.attributes.completedAt) {
                this.$(".status-select").val("complete");
                this.$(".status-select").attr("disabled", true);
            } else if(orderModel.attributes.arrivedAt) {
                this.$(".status-select").val("arrived");
                this.$(".status-select option[value='arrived'],.status-select option[value='confirmed']").attr("disabled", true);                
                this.$(".status-select").attr("disabled", false);
            } else if(orderModel.attributes.confirmedAt) {
                this.$(".status-select").val("confirmed");
                this.$(".status-select option[value='confirmed']").attr("disabled", true);
                this.$(".status-select, .status-select option[value='arrived']").attr("disabled", false);
            } else {
                this.$(".status-select").val("pending");
                this.$(".status-select, .status-select option[value='arrived'],.status-select option[value='confirmed']").attr("disabled", false);
            }
        },
        setStatusTimer: _.debounce(function(){this.setStatus();},420),
        setStatus: function(e){
            var status = this.$(".status-select").val();
            if(status==="confirmed"){
                this.confirm();
            } else if(status==="arrived") {
                this.arrive();
            } else if (status==="complete"){
                this.complete();
            }
        },
        confirm: function(){
            var that = this;
            Parse.Cloud.run("setOrderConfirmed", {orderId: this.model.id}, {
                success: function (results) {
                    console.log(results);
                    that.model.set("confirmedAt", new Date());
                    that.notification.showMessage('In route notification sent!')
                    that.$(".status-select option[value='confirmed']").html('In Route '+ new Date().toLocaleTimeString()).attr("disabled", true);
                },
                error: function (error) {
                    console.log(error);
                    $(".order-message").html(error.message);
                }
            });
        },
        arrive: function(){
            var that = this;
            Parse.Cloud.run("setOrderArrived", {orderId: this.model.id}, {
                success: function (results) {
                    console.log(results);
                    that.notification.showMessage('Arrived notification sent!')
                    that.model.set("arrivedAt", new Date());
                    that.$(".status-select option[value='arrived']").html('Arrived '+ new Date().toLocaleTimeString());
                    that.$(".status-select option[value='arrived'],.status-select option[value='confirmed']").attr("disabled", true);
                },
                error: function (error) {
                    console.log(error);
                    $(".order-message").html(error.message);
                }
            });
        },
        complete: function(){
            var that = this;
            Parse.Cloud.run("setOrderComplete", {orderId: this.model.id}, {
                success: function (results) {
                    console.log(results);
                    that.notification.showMessage('Order marked complete!')
                    that.model.set("completedAt", new Date());
                    that.$(".status-select option[value='complete']").html('Complete '+ new Date().toLocaleTimeString());
                    that.$(".status-select").attr("disabled", true);
                },
                error: function (error) {
                    console.log(error);
                    $(".order-message").html(error.message);
                }
            });
        }
    });

    App.Views.OrderThumb = App.Views.OrderOptions.extend({
        initialize: function(){
            this.notification = new App.Views.Notification({el: $("#orders .message")});
            this.model.on("change:arrivedAt change:confirmedAt change:completedAt", this.render, this);
        },
        tagName: "tr",
        template: _.template($("#order-thumb-template").html()),
        render: function(){
            $(this.el).empty();
            $(this.el).append(this.template(this.model));
            this.updateStatus(this.model);
            return this;
        },
        events: {
            "change .status-select":"setStatusTimer",
            "click .view":"view"
        },
        view: function(){
            App.Views.order.setOrder(this.model);
            App.router.navigate("order", {trigger: true});
        }
    });

    App.Views.Order = App.Views.OrderOptions.extend({
        initialize: function(){
            this.notification = new App.Views.Notification({el: this.$(".message")});
        },
        setOrder: function(orderModel){
            console.log(orderModel);
            if(this.model){this.model.off()};
            this.model = orderModel;
            this.model.on("change:arrivedAt change:confirmedAt change:completedAt", this.updateStatusTimes, this);

            if(orderModel.attributes.driver){
                this.$(".driver-select").val(orderModel.attributes.driver);
            } else {
                this.$(".driver-select").prop("selectedIndex", 0);
            }

            this.$(".user-name").html(orderModel.attributes.user.attributes.name);
            this.$(".user-address").html(orderModel.attributes.address).attr("href", "http://maps.google.com/?q="+orderModel.attributes.address);
            this.$(".user-phone").html(orderModel.attributes.user.attributes.phone);
            this.$(".order-payment").html(orderModel.attributes.payment);
            if(orderModel.attributes.note){
                this.$(".order-note").html('Note: '+orderModel.attributes.note);    
            } else {
                this.$(".order-note").empty();
            }
            this.updateStatusTimes(orderModel);
            this.$(".item-summary-table").empty();
            var number = 1;
            var that = this;
            var total = 0;
            _.each(orderModel.attributes.items, function(item){
                console.log(item);
                that.$(".item-summary-table").append('<tr><td>'+number+'. '+item[2]+'</td><td class="hidden-xs">'+item[4]+'</td><td>'+item[0]+((_.intersection(item[4], ["Flower", "Concentrate","Wax"]).length) ? ' g' : ' item') +'</td><td>$'+Math.round(item[1])+'</td></tr>');
                number++;
                total += item[1];
            });
            console.log(total);
            this.$(".total").html('$'+total);
        },
        updateStatusTimes: function(orderModel){
            this.updateStatus(orderModel);
            this.$(".order-pending").html(orderModel.createdAt.toLocaleString());
            if(orderModel.attributes.confirmedAt){
                this.$(".order-confirmed").html(orderModel.attributes.confirmedAt.toLocaleTimeString());
            } else if (!orderModel.attributes.arrivedAt && !orderModel.attributes.completedAt) {
                this.$(".order-confirmed").html('<a class="confirm">Send In Route</a>');
            } else {
                this.$(".order-confirmed").html('');
            }
            if(orderModel.attributes.arrivedAt){
                this.$(".order-arrived").html(orderModel.attributes.arrivedAt.toLocaleTimeString());
            } else if (!orderModel.attributes.completedAt) {
                this.$(".order-arrived").html('<a class="arrive">Send Arrived</a>');
            } else {
                this.$(".order-arrived").html('');
            }
            if(orderModel.attributes.completedAt){
                this.$(".order-complete").html(orderModel.attributes.completedAt.toLocaleTimeString())
            } else {
                this.$(".order-complete").html('<a class="complete">Mark Complete</a>');
            }
        },
        events: {
            "click .back":"back",
            "click .view-docs":"viewDocs",
            "click .hide-docs":"hideDocs",
            "change .status-select":"setStatusTimer",
            "change .driver-select":"selectDriver",
            "click .confirm":"confirm",
            "click .arrive":"arrive",
            "click .complete":"complete"
        },
        back: function(){
            App.router.navigate("orders", {trigger: true});
        },
        viewDocs: function(){
            console.log('view docs triggered');///c
            this.$(".docs").html('<label>Recomendation:</label><div class="rec-img"></div><label>CA ID:</label><div class="id-img"></div>');
            if(this.model.attributes.user.attributes.recFile){
                this.$(".rec-img").html('<img src="'+this.model.attributes.user.attributes.recFile._url+'">');
            } else {
                this.$(".rec-img").html('<p>No Recomendation Uploaded</p>');
            }
            if(this.model.attributes.user.attributes.idFile){
                this.$(".id-img").html('<img src="'+this.model.attributes.user.attributes.idFile._url+'">');
            } else {
                this.$(".id-img").html('<p>No ID Uploaded</p>');
            }
            
            this.$(".view-docs").html('Hide Rec/Id').removeClass("view-docs green-btn").addClass("hide-docs purple-btn");
            this.$("table").fadeOut();
        },
        hideDocs: function(){
            this.$(".docs").children().remove();
            this.$(".hide-docs").html('View Rec/Id').removeClass("hide-docs purple-btn").addClass("view-docs green-btn");
            this.$("table").fadeIn();
        },
        selectDriver: function(){
            var that = this;
            this.model.set("driver",this.$(".driver-select").val());
            this.model.save().then(function(){
                that.notification.showMessage('Driver selected');
            }, function(error){
                that.notification.showMessage(error.message);
            });
        }
    });

    App.Views.Inventory = Parse.View.extend({
        initialize: function(){
            this.collection.on("reset", this.reset, this);
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive("#inventory-link");
            });
            this.notification = new App.Views.Notification({el: this.$(".message")});
        },
        setStore: function(storeModel){
            var that = this;
            itemQuery = new Parse.Query("Item");
            itemQuery.equalTo("store", storeModel);
            itemQuery.ascending("name");
            itemQuery.include("data");
            itemQuery.find().then(function(items){
                console.log(items);
                that.collection.reset(items);
                that.renderItems();
            });
        },
        events: {
            "click .new-item":"newItem",
            "click .more":"renderItems"
        },
        newItem: function(){
            var item = new App.Models.Item();
            item.set("store", App.store);
            App.Views.item.setItem(item);
            App.router.navigate("item", {trigger: true});
        },
        reset: function(){
            this.$(".items").empty();
            this.itemQue = 0;
            this.renderItems();
        },
        renderItems: function(){
            var remaining = this.collection.length-this.itemQue;
            if (remaining <= 20 ) {
                var perPage = remaining;
                this.$(".more").hide();
            } else {
                var perPage = 20;
                this.$(".more").show();
            }
            while (perPage > 0) {
                this.renderItem();
                perPage--;
            }
        },
        renderItem: function(){
            var item = new App.Views.ItemThumb({model: this.collection.models[this.itemQue]});
            this.$(".items").append(item.render().el);
            App.test = item;
            // item.$(".item-number").html('#'+(this.itemQue+1));
            this.itemQue++;
            return this;
        }
    });

    App.Views.ItemThumb = Parse.View.extend({
        initialize: function(){
            this.model.on("change:live change:fileThumbSmall", this.render, this);
        },
        tagName: "tr",
        template: _.template($("#item-template").html()),
        render: function(){
            $(this.el).empty();
            $(this.el).append(this.template(this.model));
            this.$(".live-select").val(this.model.attributes.live.toString());
            return this;
        },
        events: {
            "click .edit":"editItem",
            "change .live-select":"updateLive"
        },
        updateLive: function(){
            var that = this;
            this.model.set("live",JSON.parse(this.$(".live-select").val()));
            this.model.save().then(function(result){
                console.log(result);
                if(that.model.attributes.live && !_.filter(App.store.attributes.items, function(item){ return item.id === that.model.id; }).length){
                    console.log('item is live and not in App.store, updating pointer');
                    App.store.add("items", that.model);
                    App.store.save().then(function(result){
                        App.Views.inventory.notification.showMessage("Item set to available");
                        console.log(result);
                    }, function(error){
                        App.Views.inventory.notification.showMessage(error.message);
                        console.log(error);
                    });
                } else if (!that.model.attributes.live && _.filter(App.store.attributes.items, function(item){ return item.id === that.model.id; }).length) {
                    console.log('item not live and is in App.store, updating pointer');
                    App.store.remove("items", that.model);
                    App.store.save().then(function(result){
                        App.Views.inventory.notification.showMessage("Item set to out of stock");
                        console.log(result)
                    }, function(error){
                        App.Views.inventory.notification.showMessage(error.message);
                        console.log(error);
                    });
                } else {
                    console.log('no item live change, keeping current pointer');
                }
            }, function(error){
                that.$(".live-select").val("false");
                App.Views.inventory.notification.showMessage(error.messsage);
                console.log(error);
            });
        },
        editItem: function(){
            App.Views.item.setItem(this.model);
            App.router.navigate("item", {trigger: true});
        }
    });

    App.Views.EditItem = Parse.View.extend({
        initialize: function(){
            var that = this;
            this.$el.on("app:show", function(){
               that.reset();
               App.Views.menu.clearActive();
            });
            this.notification = new App.Views.Notification({el: this.$(".message")});
        },
        reset: function(){
            //deselect all categories
        },
        setItem: function(itemModel){
            this.model = itemModel;
            this.updateInventory();

            this.$(".page-title").html('<span class="flaticon-left"></span> Edit Item');
            this.$(".live-select").val(itemModel.attributes.live.toString());
            this.$("#name-input").val(itemModel.attributes.name || '');
            this.$("#brand-input").val(itemModel.attributes.brand || '');
            this.$("#category-select").val(itemModel.attributes.category || '');
            if(itemModel.attributes.type){
                this.$("#type-select").val(itemModel.attributes.type.join(","));
            } else {
                this.$("#type-select").val("");
            }
            this.$("#featured-select").val(itemModel.attributes.featured || '');

            this.$(".prices").html('<div class="row"><div class="col-xs-6"><span>Amount (grams/items)</span></div><div class="col-xs-6"><span>For Price ($)</span></div></div>');
            if(itemModel.attributes.price){
                var that = this;
                _.each(itemModel.attributes.price, function(price){
                    console.log(price);
                    that.$(".prices").append('<div class="row price-option"><div class="col-xs-6"><input data-role="none" type="number" class="amount form-control" value="'+price.amount+'" placeholder=""></div><div class="col-xs-6"><input data-role="none" type="number" class="price form-control" value="'+price.total+'" placeholder=""></div></div>');
                });
            } else {
                this.addPrice();
            }

            if(itemModel.attributes.fileThumb){
                this.$(".item-img").css("background-image", 'url('+itemModel.attributes.fileThumb._url+')');
            } else {
                this.$(".item-img").css("background-image", '');
            }

            if(itemModel.attributes.special) {
                this.$("#special-percent-input").val(itemModel.attributes.special*100);
            } else {
                this.$("#special-percent-input").val(0);
            }
            this.updateSpecialPrice();

            this.$("#description-input").val(itemModel.attributes.description || '');
        },
        updateInventory: function(){
            if(!this.model.attributes.data){
                var data = new App.Models.ItemData();
                this.model.set("data", data);
                this.$("#inventory-lbs-input").val(0);
                this.$("#inventory-ozs-input").val(0);
                this.$("#inventory-gs-input").val(0);
            } else if (this.model.attributes.data.has("inventoryAmount")) {
                if(this.model.attributes.data.attributes.inventoryAmount < 0){
                    this.$("#inventory-lbs-input").val(Math.ceil(this.model.attributes.data.attributes.inventoryAmount / 453.592));
                    this.$("#inventory-ozs-input").val(Math.ceil(this.model.attributes.data.attributes.inventoryAmount % 453.592 / 28.3495));
                } else {
                    this.$("#inventory-lbs-input").val(Math.floor(this.model.attributes.data.attributes.inventoryAmount / 453.592));
                    this.$("#inventory-ozs-input").val(Math.floor(this.model.attributes.data.attributes.inventoryAmount % 453.592 / 28.3495));
                }
                var amount = this.model.attributes.data.attributes.inventoryAmount % 28.3495;
                this.$("#inventory-gs-input").val(amount.toFixed(2));
            }
            if((_.intersection(this.model.attributes.category, ["Flower", "Concentrate","Wax"]).length)){
                this.$(".inventory-gs div div").html("gs");
                this.$(".inventory-gs").removeClass("col-md-pull-4");
                this.$(".inventory-lbs").show();
                this.$(".inventory-ozs").show();
            } else {
                this.$(".inventory-gs div div").html("items");
                this.$(".inventory-gs").addClass("col-md-pull-4");
                this.$(".inventory-lbs").hide();
                this.$(".inventory-ozs").hide();
            }
        },
        events: {
            "click .back":"back",
            "click .exit":"back",
            "change #image-input":"uploadImage",
            "change .live-select":"saveItem",
            "change #category-select":"updateCategory",
            "click .add":"addPrice",
            "change .price":"updateSpecialPrice",
            "change #special-percent-input":"updateSpecialPrice",
            "click #save-button":"saveItem"
        },
        back: function(){
            App.router.navigate("inventory", {trigger: true});
        },
        uploadImage: function(){
            var upload = this.$("#image-input")[0];
            if (upload.files.length > 0) {
              var image = upload.files[0];
              var name = "photo.jpg";
              var file = new Parse.File(name, image);
              App.file = file;
              this.model.set("file",file);
              var that = this;
              this.model.save().then(function(item){
                that.$(".item-img").css("background-image", 'url('+item.attributes.fileThumb._url+')');
              }, function(error){
                that.$(".image-message").html(error.message).show();
              });
            }
        },
        updateCategory: function(){
            this.model.set("category",[this.$("#category-select").val()]);
            this.updateInventory();
        },
        addPrice: function(){
            this.$(".prices").append('<div class="row price-option"><div class="col-xs-6"><input data-role="none" type="number" class="amount form-control" placeholder=""></div><div class="col-xs-6"><input data-role="none" type="number" class="price form-control" placeholder=""></div></div>');
        },
        updateSpecialPrice: function(){
            if(this.$("#special-percent-input").val() > 0){
                this.$(".special-prices").html('<div class="row"><div class="col-xs-6"><span>Amount (grams/items)</span></div><div class="col-xs-6"><span>For Price ($)</span></div></div>');
                var that = this;
                this.$(".price-option").each(function(){
                    console.log(this);
                    that.$(".special-prices").append('<div class="row"><div class="col-xs-6"><input data-role="none" type="number" class="amount form-control" value="'+$(this).find(".amount").val()+'" disabled></div><div class="col-xs-6"><input data-role="none" type="number" class="price form-control" value="'+Math.round($(this).find(".price").val()-($(this).find(".price").val()*(that.$("#special-percent-input").val()/100)))+'" disabled></div></div>');
                });
                this.$(".special-price").show();
            } else {
                this.$(".special-price").hide();
            }
        },
        saveItem: function(){
            this.$('#save-button').attr("disabled", "disabled");
            var that = this;
            var prices = [];
            _.each(this.$(".price-option"),function(option){
                var price = {};
                if($(option).find(".amount").val() && $(option).find(".price").val()){
                    price.amount = JSON.parse($(option).find(".amount").val());
                    price.total = JSON.parse($(option).find(".price").val());
                    prices.push(price);
                }
            });
            if(this.$("#type-select").val()){
                var type = this.$("#type-select").val().split(",");
            }
            var amount = 0;
            if(this.$("#inventory-lbs-input").val() > 0) {
                amount += JSON.parse(this.$("#inventory-lbs-input").val()) * 453.592;
            }
            console.log(amount);///c
            if(this.$("#inventory-ozs-input").val() > 0) {
                amount += JSON.parse(this.$("#inventory-ozs-input").val()) * 28.3495;
            }
            console.log(amount);///c
            if(this.$("#inventory-gs-input").val() > 0) {
                amount += JSON.parse(this.$("#inventory-gs-input").val());
            }
            console.log(amount);///c
            this.model.attributes.data.set("inventoryAmount",amount);
            this.model.save({
                live: JSON.parse(this.$(".live-select").val()),
                name: this.$("#name-input").val(),
                brand: this.$("#brand-input").val(),
                // category: [this.$("#category-select").val()], // already set
                type: type,
                // featured: JSON.parse(this.$("#featured-select").val()),
                description: this.$("#description-input").val(),
                price: prices,
                special: this.$("#special-percent-input").val()/100,
                store: App.store
            },{
                success: function(item) {
                    console.log(item);
                    that.$('#save-button').removeAttr("disabled");
                    that.notification.showMessage('Item saved');

                    if(that.model.attributes.live && !_.filter(App.store.attributes.items, function(item){ return item.id === this.model.id; }).length){
                        console.log('item is live and not in App.store, updating pointer');
                        App.store.add("items", that.model);
                        App.store.save();
                    } else if (!that.model.attributes.live && _.filter(App.store.attributes.items, function(item){ return item.id === this.model.id; }).length) {
                        console.log('item not live and is in App.store, updating pointer');
                        App.store.remove("items", that.model);
                        App.store.save();
                    } else {
                        console.log('no item live change, keeping current pointer');
                    }
                },
                error: function(item, error) {
                    console.log(error);
                    that.notification.showMessage(error.message);
                    that.$('#save-button').removeAttr("disabled");
                }
            });
        },
        setLive: function(){

        }
    });

    App.Views.EditProfile = Parse.View.extend({
        initialize: function(){
            var that = this;
            this.$el.on("app:show", function(){
                that.reset();
               App.Views.menu.clearActive("#profile-link");
            });
            this.notification = new App.Views.Notification({el: this.$(".message")});
        },
        reset: function(){
            this.$("p").html('');
        },
        setStore: function(storeModel){
            App.Views.menu.setStoreLink(storeModel.attributes.name);

            this.$(".live-select").val(storeModel.attributes.live.toString());
            this.$("#name-input").val(storeModel.attributes.name);
            if(!storeModel.attributes.link) {
                this.$("#link-input").val(storeModel.attributes.name.replace(/\W/g, '').toLowerCase());
            } else {
                this.$("#link-input").val(storeModel.attributes.link);
            }
            this.$("#email-input").val(storeModel.attributes.email);
            this.$("#address-input").val(storeModel.attributes.address);
            this.$("#contact-input").val(storeModel.attributes.contact);
            // if(storeModel.attributes.delivery) {
            //     this.$("#delivery-select").val("true");
            //     this.$("#delivery-select").flipswitch().flipswitch("refresh");
            // } else {
            //     this.$("#delivery-select").val("false");
            //     this.$("#delivery-select").flipswitch().flipswitch("refresh");
            // }
            // if(storeModel.attributes.retail) {
            //     this.$("#pickup-select").val("true");
            //     this.$("#pickup-select").flipswitch().flipswitch("refresh");
            // } else {
            //     this.$("#pickup-select").val("false");
            //     this.$("#pickup-select").flipswitch().flipswitch("refresh");
            // }
            this.$("#radius-input").val(storeModel.attributes.radius);
            this.$("#min-input").val(storeModel.attributes.min);
            this.$("#cash-check").prop('checked', storeModel.attributes.cash || false);
            this.$("#credit-check").prop('checked', storeModel.attributes.credit || false);
            this.$("#debit-check").prop('checked', storeModel.attributes.debit || false);

            this.$("#description-input").val(storeModel.attributes.description);
            this.$("#sunday-open-input").val(storeModel.attributes.hours[0][0]);
            this.$("#sunday-close-input").val(storeModel.attributes.hours[0][1]);
            this.$("#monday-open-input").val(storeModel.attributes.hours[1][0]);
            this.$("#monday-close-input").val(storeModel.attributes.hours[1][1]);
            this.$("#tuesday-open-input").val(storeModel.attributes.hours[2][0]);
            this.$("#tuesday-close-input").val(storeModel.attributes.hours[2][1]);
            this.$("#wednesday-open-input").val(storeModel.attributes.hours[3][0]);
            this.$("#wednesday-close-input").val(storeModel.attributes.hours[3][1]);
            this.$("#thursday-open-input").val(storeModel.attributes.hours[4][0]);
            this.$("#thursday-close-input").val(storeModel.attributes.hours[4][1]);
            this.$("#friday-open-input").val(storeModel.attributes.hours[5][0]);
            this.$("#friday-close-input").val(storeModel.attributes.hours[5][1]);
            this.$("#saturday-open-input").val(storeModel.attributes.hours[6][0]);
            this.$("#saturday-close-input").val(storeModel.attributes.hours[6][1]);

            this.$("#phone-input").val(storeModel.attributes.phone);
            this.$("#website-input").val(storeModel.attributes.website);
            this.$("#instagram-input").val(storeModel.attributes.instagram);
            this.$("#facebook-input").val(storeModel.attributes.facebook);
            this.$("#twitter-input").val(storeModel.attributes.twitter);
        },
        events: {
            "click .verify-button":"verifyPhone",
            "click .confrim-button":"confirmPhone",
            "change #link-input":"startSetLink",
            "change .live-select":"save",
            "click #profile-save-button":"save",
            "change #address-input":"startSetLocation"
        },
        verifyPhone: function(){
            var that = this;
            this.$("#phone-input").attr("disabled", "disabled");
            this.$(".verify-button").attr("disabled", "disabled");
            Parse.Cloud.run("sendVerificationCode", {phone:this.$("#phone-input").val()}, {
                success: function (results) {
                    console.log(results);
                    that.$(".phone-message").html('Verification code sent, enter it below');
                    that.$(".confirm-options").fadeIn();
                },
                error: function (error) {
                    console.log(error);
                    that.$("#phone-input").removeAttr("disabled");
                    that.$(".verify-button").removeAttr("disabled");
                }
            });
        },
        confirmPhone: function(){
            var that = this;
            if(this.$("#confirm-phone-input").val()){
                Parse.Cloud.run("verifyPhone", {phone:this.$("#phone-input").val(), phoneVerificationCode:this.$("#confirm-phone-input").val()}, {
                    success: function (results) {
                        App.store.set("phone", this.$("#phone-input").val());
                        App.store.save();
                        that.$(".phone-message").html('Phone verified!');
                        that.$(".confirm-options").fadeOut();
                        that.$("#phone-input").removeAttr("disabled");
                    },
                    error: function (error) {
                        that.$(".phone-message").html(error);
                        that.$("#phone-input").removeAttr("disabled");
                    }
                });
            }
        },
        startSetLink: _.debounce(function(){this.setLink(); console.log('link changed');}, 700),
        setLink: function(){
            $(".link-message").html("Checking username");
            this.$("#link-input").val(this.$("#link-input").val().replace(/\W/g, '').toLowerCase());
            Parse.Cloud.run("checkStoreLink",{
                link: this.$("#link-input").val(),
                email: this.$("#email-input").val()
            }, {
                success: function (result) {
                    console.log(result);
                    $(".link-message").html(result);
                },
                error: function (error) {
                    console.log(error);
                    $(".link-message").html(error.message);
                }
            });
        },
        startSetLocation: _.debounce(function(){this.setLocation(); console.log('address changed');}, 1200),
        setLocation: function(){
            console.log("ADDRESS SEARCHING");
            $(".address-message").html("Looking up address");
            $.ajax({
               url : 'https://maps.googleapis.com/maps/api/geocode/json?address='+$("#address-input").val().split(" ").join("+")+'&components=administrative_area:CA',
               method: "POST",
               success:function(data){
                  if (data.status == "OK"){
                    latitude = data.results[0].geometry.location.lat;
                    longitude = data.results[0].geometry.location.lng;
                    
                    geo = new Parse.GeoPoint({latitude: latitude, longitude: longitude});
                    address = data.results[0].formatted_address;
                    $(".address-message").html("Address set to: "+address);
                    App.store.set("location", geo);
                    App.store.set("address", address);
                    App.store.save();

                  } else if (data.status == "ZERO_RESULTS") {
                    console.log('no results found');
                    $(".address-message").html("Address not found");
                  } else {
                    console.log("some other error");
                    $(".address-message").html("Bad Address, try another");
                  }
                  console.log(data.status);
               }
            });
        },
        save: function(){
            this.$('#profile-save-button').attr("disabled", "disabled");
            var that = this;
            App.store.set("live", JSON.parse(this.$(".live-select").val()));
            App.store.set("name", this.$("#name-input").val());
            App.store.set("link", this.$("#link-input").val());
            App.store.set("username", this.$("#email-input").val());
            App.store.set("contact", this.$("#contact-input").val());
            App.store.set("delivery", true);
            App.store.set("retail", false);
            // App.store.set("delivery", JSON.parse(this.$("#delivery-select").val()));
            // App.store.set("retail", JSON.parse(this.$("#pickup-select").val()));
            App.store.set("radius", parseInt(this.$("#radius-input").val()));
            App.store.set("min",  parseInt(this.$("#min-input").val()));
            App.store.set("description", this.$("#description-input").val());
            App.store.set("hours",[
                [this.$("#sunday-open-input").val(), this.$("#sunday-close-input").val()],
                [this.$("#monday-open-input").val(), this.$("#monday-close-input").val()],
                [this.$("#tuesday-open-input").val(), this.$("#tuesday-close-input").val()],
                [this.$("#wednesday-open-input").val(), this.$("#wednesday-close-input").val()],
                [this.$("#thursday-open-input").val(), this.$("#thursday-close-input").val()],
                [this.$("#friday-open-input").val(), this.$("#friday-close-input").val()],
                [this.$("#saturday-open-input").val(), this.$("#saturday-close-input").val()]
            ]);
            App.store.set("cash", this.$("#cash-check").prop('checked'));
            App.store.set("credit", this.$("#credit-check").prop('checked'));
            App.store.set("debit", this.$("#debit-check").prop('checked'));
            App.store.set("phone", this.$("#phone-input").val());
            App.store.set("website", this.$("#website-input").val());

            // need to create FE template
            App.store.set("instagram", this.$("#instagram-input").val());
            App.store.set("facebook", this.$("#facebook-input").val());
            App.store.set("twitter", this.$("#twitter-input").val());
            App.store.save(null,{
                success: function(user) {
                    console.log(user);
                    that.notification.showMessage('Profile saved!');
                    that.$('#profile-save-button').removeAttr("disabled");
                },
                error: function(user, error) {
                    console.log(error);
                    that.notification.showMessage(error.message);
                    that.$('#profile-save-button').removeAttr("disabled");
                }
            });
        }
    });

    App.Views.Settings = Parse.View.extend({
        initialize: function(){
            this.$el.on("app:show", function(){
               App.Views.menu.clearActive("#settings-link");
            });
            this.notification = new App.Views.Notification({el: this.$(".message")});
        },
        events: {
            "click #logout-link":"logout",
            "click #settings-save-button":"save"
        },
        save: function(){
            this.$('#settings-save-button').attr("disabled",true);
            var that = this;
            Parse.User.current().save({
                password: this.$("#password-input").val()
            },{
                success: function(user) {
                    console.log(user);
                    that.$('#settings-save-button').removeAttr("disabled");
                    that.notification.showMessage('Password updated');
                },
                error: function(user, error) {
                    console.log(error);
                    that.notification.showMessage(error.message);
                    that.$('#settings-save-button').removeAttr("disabled");
                }   
            });

        },
        logout: function(){
            $.when(Parse.User.logOut()).then(function () {
                App.initUser();
            });
        }
    });

    App.Views.Notification = Parse.View.extend({
        initialize: function() {

        },
        events: {
            "click .close":"close"
        },
        showMessage: function(message){
            this.$el.html(message);
            this.$el.stop().animate({opacity:1}, "slow");
            var that = this;
            this.closeTimer();
        },
        closeTimer: _.debounce(function(){ this.close(); }, 3000),
        close: function(){
            this.$el.stop().animate({opacity:0},"slow");
        }
    });

    App.Views.Menu = Parse.View.extend({
        initialize: function() {
            $(".open-panel").on("click", function(){
                $("#menu").panel("open");
            });
        },
        hideLinks: function(){
            this.$(".main-menu-list").html('<li class="herbside-title"><div class="main-font" style="color: white !important;">Sage</div></li>');
            return this;
        },
        showWelcomeLinks: function(){
            this.$("#user-link").html('');
            this.hideLinks().$(".herbside-title").after('<li><a class="main-font ui-btn main-link active">Welcome</a></li>');
        },
        showAdminLinks: function(){
            this.hideLinks().$(".herbside-title").after('<li><a id="admin-link" class="main-font ui-btn main-link active">Admin</a></li><div id="user-link">Select Store</div><li><a id="orders-link" class="main-font ui-btn main-link">Orders</a></li><li><a id="inventory-link" class="main-font ui-btn main-link">Inventory</a></li><li><a id="profile-link" class="main-font ui-btn main-link">Profile</a></li><li><a id="settings-link" class="main-font ui-btn main-link">Settings</a></li>');
        },
        showStoreLinks: function(storeModel){
            this.hideLinks().$(".herbside-title").after('<div id="user-link"></div><li><a id="orders-link" class="main-font ui-btn main-link active">Orders</a></li><li><a id="inventory-link" class="main-font ui-btn main-link">Inventory</a></li><li><a id="profile-link" class="main-font ui-btn main-link">Profile</a></li><li><a id="settings-link" class="main-font ui-btn main-link">Settings</a></li>');
            this.setStoreLink(storeModel.attributes.name);
        },
        setStoreLink: function(storeName){
            this.$("#user-link").html(storeName);
        },
        events: {
            "click #admin-link":"admin",
            "click #orders-link":"orders",
            "click #inventory-link":"inventory",
            "click #profile-link":"profile",
            "click #settings-link":"settings"
        },
        clearActive: function(link){
            $(".main-link").removeClass("active");
            if(link){$(link).addClass("active");};
        },
        admin: function(){
            App.router.navigate("admin", {trigger: true});
        },
        orders: function(e){
            App.router.navigate("orders", {trigger: true});
        },
        inventory: function(e){
            App.router.navigate("inventory", {trigger: true});
        },
        profile: function(e){
            App.router.navigate("profile", {trigger: true});
        },
        settings: function(e){
            App.router.navigate("settings", {trigger: true});
        }
    });

    App.Router = Parse.Router.extend( {
        initialize: function() {
            $("#menu").panel();
            App.Views.menu = new App.Views.Menu({el: "#menu"});

            App.Views.welcome = new App.Views.Welcome({el: "#welcome"});
            App.Views.orders = new App.Views.Orders({el: "#orders", collection: App.Collections.orders});
            App.Views.order = new App.Views.Order({el: "#order-summary"});
            App.Views.inventory = new App.Views.Inventory({el: "#inventory", collection: App.Collections.items});
            App.Views.item = new App.Views.EditItem({el: "#item"});
            App.Views.editProfile = new App.Views.EditProfile({el: "#profile"});
            App.Views.settings = new App.Views.Settings({el: "#settings"});
            
            this.on('all', function () { 
                console.log('routing to ~ '+Parse.history.getFragment()); 
                this.backRoute = Parse.history.getFragment(); 
            }, this);

            var that = this;
            $( "body" ).on( "pagecontainerbeforeshow", function( event, ui ) {
                ui.toPage.trigger('app:show');
                that.backPage = ui.prevPage;
            });
        },
        routes: {
            "welcome":"welcome",
            "admin":"admin",
            "orders":"orders",
            "order":"order",
            "inventory":"inventory",
            "profile":"profile",
            "settings":"settings",
            "item":"item"
        },
        back: function(route, page){
            this.backRoute = route;
            $('body').pagecontainer("change",page,{transition:"slide",reverse: true});
            App.router.navigate(route, {trigger: false});
        },
        welcome: function(){
            $('body').pagecontainer("change","#welcome",{});
        },
        admin: function(){
            $('body').pagecontainer("change","#admin",{});
        },
        orders: function(){
            $('body').pagecontainer("change","#orders",{});
        },
        order: function(){
            $('body').pagecontainer("change","#order-summary",{});
        },
        inventory: function(){
            $('body').pagecontainer("change","#inventory",{});
        },
        profile: function(){
            $('body').pagecontainer("change","#profile",{});
        },
        settings: function(){
            $('body').pagecontainer("change","#settings",{});
        },
        item: function(){
            $('body').pagecontainer("change","#item",{});
        }
    });

    App.start();

});
