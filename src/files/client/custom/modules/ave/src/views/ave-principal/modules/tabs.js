define('ave:views/ave-principal/modules/tabs', [], function () {

    var TabsManager = function (view) {
        this.view    = view;
        this.tabActual = 'tab-1';
    };

    TabsManager.prototype.activarTab = function (tabId) {
        var self = this;
        this.tabActual = tabId;

        this.view.$el.find('.ave-tab-btn').removeClass('active');
        this.view.$el.find('.ave-tab-btn[data-tab="' + tabId + '"]').addClass('active');

        this.view.$el.find('.ave-tab-pane').removeClass('active');
        this.view.$el.find('#' + tabId).addClass('active');

        // Scroll suave al inicio del contenido
        var $content = this.view.$el.find('.ave-tab-content');
        if ($content.length) {
            $('html, body').animate({
                scrollTop: $content.offset().top - 80
            }, 300);
        }

        // Acciones especiales por tab
        if (tabId === 'tab-7') {
            // Cargar select de factores si no estaba cargado
        }
        if (tabId === 'tab-12') {
            self.view.previewManager.generar();
        }
    };

    TabsManager.prototype.getTabActual = function () {
        return this.tabActual;
    };

    return TabsManager;
});
