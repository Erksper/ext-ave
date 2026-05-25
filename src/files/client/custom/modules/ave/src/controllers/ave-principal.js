define('ave:controllers/ave-principal', ['controllers/record'], function (Dep) {

    return Dep.extend({

        actionCreate: function (options) {
            var self = this;
            Espo.Ajax.postRequest('AvePrincipal', { name: 'Nuevo AVE' })
                .then(function (response) {
                    if (response && response.id) {
                        // Redirige a la vista estándar 'view'
                        self.getRouter().navigate('#AvePrincipal/view/' + response.id, { trigger: true });
                    } else {
                        Espo.Ui.error('No se pudo crear el avalúo');
                        self.getRouter().navigate('#AvePrincipal', { trigger: true });
                    }
                })
                .catch(function () {
                    Espo.Ui.error('Error al crear el avalúo');
                    self.getRouter().navigate('#AvePrincipal', { trigger: true });
                });
        }

    });
});