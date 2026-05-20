define('ave:controllers/ave-principal', ['controllers/record'], function (Dep) {

    console.log('[AVE Controller] Archivo cargado correctamente');

    return Dep.extend({

        actionList: function (options) {
            console.log('[AVE Controller] actionList iniciada', options);
            var self = this;
            this.viewFactory.create('ave:views/ave-principal/list', {
                scope: 'AvePrincipal',
                params: options
            }, function (view) {
                console.log('[AVE Controller] Vista list creada', view);
                self.main(view);
            });
        },

        actionAve: function (options) {
            console.log('[AVE Controller] actionAve iniciada', options);
            var id = options.id;
            if (!id) {
                console.warn('[AVE Controller] No se proporcionó ID, redirigiendo a lista');
                this.getRouter().navigate('#AvePrincipal', { trigger: true });
                return;
            }
            this.viewFactory.create('ave:views/ave-principal/detail', {
                scope: 'AvePrincipal',
                aveId: id,
                params: options
            }, function (view) {
                console.log('[AVE Controller] Vista detail creada', view);
                self.main(view);
            });
        },

        actionCreate: function (options) {
            console.log('[AVE Controller] actionCreate iniciada');
            var self = this;
            Espo.Ajax.postRequest('AvePrincipal', { name: 'Nuevo AVE' })
                .then(function (response) {
                    console.log('[AVE Controller] AVE creado, ID:', response.id);
                    if (response.id) {
                        self.getRouter().navigate('#AvePrincipal/ave/' + response.id, { trigger: true });
                    }
                })
                .catch(function (error) {
                    console.error('[AVE Controller] Error al crear AVE', error);
                    Espo.Ui.error('Error al crear el avalúo');
                    self.getRouter().navigate('#AvePrincipal', { trigger: true });
                });
        }
    });
});