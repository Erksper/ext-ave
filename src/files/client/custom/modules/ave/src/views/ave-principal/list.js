define('ave:views/ave-principal/list', ['view'], function (Dep) {

    console.log('[AVE List View] Archivo cargado');

    return Dep.extend({

        template: null,  // No usamos template externo, generamos HTML directamente

        setup: function () {
            console.log('[AVE List View] setup() llamado');
            Dep.prototype.setup.call(this);
            // Forzamos el render manualmente
            this.render();
        },

        render: function () {
            console.log('[AVE List View] render() - generando HTML');
            var html = `
                <div style="padding: 30px; font-family: sans-serif;">
                    <h2 style="color: #B8A279;">Módulo AVE - Lista de Avalúos</h2>
                    <p>Si ves este mensaje, la vista se está renderizando correctamente.</p>
                    <button id="test-btn" class="ave-btn ave-btn-primary">Probar</button>
                    <div id="contenido-dinamico" style="margin-top:20px;"></div>
                </div>
            `;
            this.$el.html(html);
            // Agregamos evento manualmente
            this.$el.find('#test-btn').on('click', function () {
                alert('¡Funciona! El evento se disparó correctamente.');
            });
            // Llamamos a afterRender para continuar
            this.afterRender();
            return this;
        },

        afterRender: function () {
            console.log('[AVE List View] afterRender() llamado');
            this.cargarLista();
        },

        cargarLista: function () {
            console.log('[AVE List View] cargarLista() - consultando backend');
            var self = this;
            Espo.Ajax.getRequest('AvePrincipal/action/getLista', {
                pagina: 1,
                porPagina: 5,
                numero: '',
                cliente: '',
                identificacion: '',
                asesor: ''
            })
            .then(function (response) {
                console.log('[AVE List View] Respuesta del backend:', response);
                if (response.success && response.data) {
                    var total = response.data.total || 0;
                    var html = '<p style="background:#e9ecef; padding:10px; border-radius:5px;">✅ Conexión exitosa. Total de avalúos encontrados: <strong>' + total + '</strong></p>';
                    if (total === 0) {
                        html += '<p>No hay avalúos registrados. Use el botón "Nuevo AVE" para crear uno.</p>';
                    }
                    self.$el.find('#contenido-dinamico').html(html);
                } else {
                    self.$el.find('#contenido-dinamico').html('<p style="color:red;">Error en la respuesta: ' + (response.error || 'desconocido') + '</p>');
                }
            })
            .catch(function (error) {
                console.error('[AVE List View] Error en petición:', error);
                self.$el.find('#contenido-dinamico').html('<p style="color:red;">Error de conexión con el backend. Revisa la consola.</p>');
            });
        }
    });
});