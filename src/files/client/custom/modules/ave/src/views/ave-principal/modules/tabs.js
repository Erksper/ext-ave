define('ave:views/ave-principal/modules/tabs', [], function () {

    var TabsManager = function (view) {
        this.view = view;
        this.tabActual = 'tab-1';
        // Todas bloqueadas excepto tab-1 al inicio
        this.tabsBloqueadas = new Set([
            'tab-2','tab-3','tab-4','tab-5','tab-6',
            'tab-7','tab-8','tab-9','tab-10','tab-11','tab-12'
        ]);
    };

    TabsManager.prototype.inicializar = function () {
        var self = this;
        // Aplicar estado bloqueado visualmente a todos los botones
        this.view.$el.find('.ave-tab-btn').each(function () {
            var tabId = $(this).data('tab');
            if (self.tabsBloqueadas.has(tabId)) {
                $(this).addClass('ave-tab-locked').prop('disabled', true);
            }
        });
    };

    TabsManager.prototype.desbloquearTab = function (tabId) {
        if (!this.tabsBloqueadas.has(tabId)) return;
        this.tabsBloqueadas.delete(tabId);
        this.view.$el.find('.ave-tab-btn[data-tab="' + tabId + '"]')
            .removeClass('ave-tab-locked')
            .prop('disabled', false);
    };

    TabsManager.prototype.bloquearTab = function (tabId) {
        if (tabId === 'tab-1') return; // tab-1 nunca se bloquea
        this.tabsBloqueadas.add(tabId);
        this.view.$el.find('.ave-tab-btn[data-tab="' + tabId + '"]')
            .addClass('ave-tab-locked')
            .prop('disabled', true);
        // Si estamos en esa pestaña, volver a tab-1
        if (this.tabActual === tabId) {
            this.activarTab('tab-1');
        }
    };

    TabsManager.prototype.desbloquearGrupo = function (tabIds) {
        var self = this;
        tabIds.forEach(function (id) { self.desbloquearTab(id); });
    };

    TabsManager.prototype.bloquearGrupo = function (tabIds) {
        var self = this;
        tabIds.forEach(function (id) { self.bloquearTab(id); });
    };

    TabsManager.prototype.activarTab = function (tabId) {
        if (this.tabsBloqueadas.has(tabId)) return; // bloqueada, ignorar
        this.tabActual = tabId;

        this.view.$el.find('.ave-tab-btn').removeClass('active');
        this.view.$el.find('.ave-tab-btn[data-tab="' + tabId + '"]').addClass('active');

        this.view.$el.find('.ave-tab-pane').removeClass('active');
        this.view.$el.find('#' + tabId).addClass('active');

        var $content = this.view.$el.find('.ave-tab-content');
        if ($content.length) {
            $('html, body').animate({ scrollTop: $content.offset().top - 80 }, 300);
        }

        if (tabId === 'tab-12' && this.view.previewManager) {
            this.view.previewManager.generar();
        }
    };

    TabsManager.prototype.getTabActual = function () {
        return this.tabActual;
    };

    return TabsManager;
});