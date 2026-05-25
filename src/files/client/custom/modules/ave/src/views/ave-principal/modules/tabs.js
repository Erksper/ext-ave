define('ave:views/ave-principal/modules/tabs', [], function () {

    var TabsManager = function (view) {
        this.view = view;
        this.tabActual = 'tab-1';
        console.log('TabsManager initialized');
    };

    TabsManager.prototype.activarTab = function (tabId) {
        var self = this;
        console.log('activarTab: ' + tabId);
        this.tabActual = tabId;

        this.view.$el.find('.ave-tab-btn').removeClass('active');
        this.view.$el.find('.ave-tab-btn[data-tab="' + tabId + '"]').addClass('active');

        this.view.$el.find('.ave-tab-pane').removeClass('active');
        this.view.$el.find('#' + tabId).addClass('active');

        // Scroll suave
        var $content = this.view.$el.find('.ave-tab-content');
        if ($content.length) {
            $('html, body').animate({ scrollTop: $content.offset().top - 80 }, 300);
        }

        // Acción especial para la pestaña 12 (Vista Previa)
        if (tabId === 'tab-12' && this.view.previewManager) {
            this.view.previewManager.generar();
        }
    };

    TabsManager.prototype.getTabActual = function () {
        return this.tabActual;
    };

    return TabsManager;
});