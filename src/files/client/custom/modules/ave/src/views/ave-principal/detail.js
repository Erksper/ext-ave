define('ave:views/ave-principal/detail', [
    'view',
    'ave:views/ave-principal/modules/tabs',
    'ave:views/ave-principal/modules/inmueble',
    'ave:views/ave-principal/modules/referencias',
    'ave:views/ave-principal/modules/foda',
    'ave:views/ave-principal/modules/itemsManager',
    'ave:views/ave-principal/modules/precio',
    'ave:views/ave-principal/modules/preview'
], function (Dep, TabsManager, InmuebleManager, ReferenciasManager, FodaManager, ItemsManager, PrecioManager, PreviewManager) {

    return Dep.extend({

        template: 'ave:ave-principal/detail',

        // Estado global
        aveId: null,
        aveData: null,
        inmuebleData: null,
        teamId: null,

        // Eventos
        events: {
            // Navegación
            'click [data-action="volver"]': function () {
                this.getRouter().navigate('#AvePrincipal', { trigger: true });
            },
            'click [data-action="guardar"]': function () {
                this.guardar();
            },
            'click .ave-tab-btn': function (e) {
                this.tabsManager.activarTab($(e.currentTarget).data('tab'));
            },
            'click [data-action="toggle-panel"]': function (e) {
                this.togglePanel(e);
            },
            
            // Pestaña 2 — Inmueble
            'click [data-action="nuevo-inmueble"]': function () {
                this.inmuebleManager.abrirModalNuevo();
            },
            'click [data-action="cambiar-inmueble"]': function () {
                this.inmuebleManager.limpiarSeleccion();
            },
            'click [data-action="editar-inmueble"]': function () {
                if (this.inmuebleManager.inmuebleActual) {
                    this.inmuebleManager.abrirModalEditar(this.inmuebleManager.inmuebleActual);
                }
            },
            
            // Pestaña 3 — Situación Legal
            'change .ave-legal-chk': function (e) {
                this.toggleNotaLegal(e);
            },
            
            // Pestañas 4 y 5 — Referencias
            'click #btn-add-promocion': function () {
                this.referenciasManager.abrirModal('promocion', null);
            },
            'click #btn-add-vendido': function () {
                this.referenciasManager.abrirModal('vendido', null);
            },
            'click [data-action="editar-ref"]': function (e) {
                var $btn = $(e.currentTarget);
                this.referenciasManager.abrirModal($btn.data('tipo'), parseInt($btn.data('idx')));
            },
            'click [data-action="eliminar-ref"]': function (e) {
                var $btn = $(e.currentTarget);
                this.referenciasManager.eliminar($btn.data('tipo'), parseInt($btn.data('idx')));
            },
            
            // Pestaña 6 — FODA
            'click [data-action="agregar-foda"]': function () {
                this.fodaManager.abrirModalAgregar();
            },
            'click [data-action="nuevo-titulo-foda"]': function () {
                this.fodaManager.abrirModalNuevoTitulo();
            },
            'click [data-action="eliminar-foda"]': function (e) {
                var $btn = $(e.currentTarget);
                this.fodaManager.eliminar($btn.data('tipo'), parseInt($btn.data('idx')));
            },
            
            // Pestaña 7 — Factores
            'click [data-action="agregar-factor"]': function () {
                this.factoresManager.agregarDesdeSelect();
            },
            'click [data-action="nuevo-factor"]': function () {
                this.factoresManager.abrirModalNuevo();
            },
            'click [data-action="quitar-factor"]': function (e) {
                this.factoresManager.quitar($(e.currentTarget).data('idx'));
            },
            
            // Pestaña 8 — Precio Sugerido
            
            // Pestaña 9 — Decisiones
            'click [data-action="agregar-decision"]': function () {
                this.decisionesManager.agregarDesdeSelect();
            },
            'click [data-action="nueva-decision"]': function () {
                this.decisionesManager.abrirModalNuevo();
            },
            'click [data-action="quitar-decision"]': function (e) {
                this.decisionesManager.quitar($(e.currentTarget).data('idx'));
            },
            
            // Pestaña 10 — Medios
            'click [data-action="agregar-canal"]': function () {
                this.canalesManager.agregarDesdeSelect();
            },
            'click [data-action="nuevo-canal"]': function () {
                this.canalesManager.abrirModalNuevo();
            },
            'click [data-action="quitar-canal"]': function (e) {
                this.canalesManager.quitar($(e.currentTarget).data('idx'));
            },
            
            // Pestaña 11 — Plan de Trabajo
            'click [data-action="agregar-plan"]': function () {
                this.planesManager.agregarDesdeSelect();
            },
            'click [data-action="nuevo-plan"]': function () {
                this.planesManager.abrirModalNuevo();
            },
            'click [data-action="quitar-plan"]': function (e) {
                this.planesManager.quitar($(e.currentTarget).data('idx'));
            },
            
            // Pestaña 12 — Vista Previa
            'click [data-action="generar-preview"]': function () {
                this.previewManager.generar();
            },
            
            // Validación de email
            'input #correoCliente': function () {
                this.validarEmail();
            }
        },

        // ─────────────────────────────────────────────────────────────
        // Setup
        // ─────────────────────────────────────────────────────────────
        setup: function () {
            Dep.prototype.setup.call(this);
            console.log('detail.setup()');
            
            this.aveId = this.model.id;
            if (!this.aveId) {
                Espo.Ui.error('ID de AVE no proporcionado');
                this.getRouter().navigate('#AvePrincipal', { trigger: true });
                return;
            }
            
            // Obtener team del usuario
            var user = this.getUser();
            this.teamId = (user.get('defaultTeamId') || (user.get('teamsIds') || [])[0]) || null;
            
            // Inicializar managers
            this.tabsManager = new TabsManager(this);
            this.inmuebleManager = new InmuebleManager(this);
            this.referenciasManager = new ReferenciasManager(this);
            this.fodaManager = new FodaManager(this);
            
            // Managers genéricos
            this.factoresManager = new ItemsManager(this, 'factor', {
                labelSingular: 'factor',
                tieneImpacto: true,
                tieneDescripcion: true
            });
            this.decisionesManager = new ItemsManager(this, 'decision', {
                labelSingular: 'decisión',
                tieneImpacto: false,
                tieneDescripcion: true
            });
            this.canalesManager = new ItemsManager(this, 'canal', {
                labelSingular: 'medio',
                tieneImpacto: false,
                tieneDescripcion: false
            });
            this.planesManager = new ItemsManager(this, 'plan', {
                labelSingular: 'plan',
                tieneImpacto: false,
                tieneDescripcion: true
            });
            
            this.precioManager = new PrecioManager(this);
            this.previewManager = new PreviewManager(this);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.cargarDatos();
        },

        // ─────────────────────────────────────────────────────────────
        // Carga de datos
        // ─────────────────────────────────────────────────────────────
        cargarDatos: function () {
            var self = this;
            this.$el.find('#ave-detail-loading').show();
            this.$el.find('#ave-detail-content').hide();

            Espo.Ajax.getRequest('AvePrincipal/action/getOrCreate', { id: this.aveId })
                .then(function (response) {
                    console.log('Respuesta completa:', response);
                    if (!response.success) throw new Error(response.error || 'Error al cargar');
                    
                    self.aveData = response.data.ave;
                    self.inmuebleData = response.data.inmueble;
                    
                    self.$el.find('#ave-detail-loading').hide();
                    self.$el.find('#ave-detail-content').show();
                    
                    var numero = self.aveData.numeroAve || 'Sin número asignado';
                    self.$el.find('#ave-subtitle').text(numero);
                    
                    // Cargar catálogos de items
                    self.factoresManager.cargarCatalogo(self.teamId);
                    self.fodaManager.cargarCatalogo(self.teamId);
                    self.decisionesManager.cargarCatalogo(self.teamId);
                    self.canalesManager.cargarCatalogo(self.teamId);
                    self.planesManager.cargarCatalogo(self.teamId);
                    
                    self.poblarFormulario(response.data);
                })
                .catch(function (err) {
                    console.error('Error en cargarDatos:', err);
                    self.$el.find('#ave-detail-loading').hide();
                    Espo.Ui.error('Error al cargar el AVE: ' + (err.message || ''));
                });
        },

        // ─────────────────────────────────────────────────────────────
        // Poblar formulario
        // ─────────────────────────────────────────────────────────────
        poblarFormulario: function (data) {
            var ave = data.ave || {};
            
            // Pestaña 1 — Datos Generales
            this.$el.find('#numeroAve').val(ave.numeroAve || '');
            this.$el.find('#tipoIdentificacion').val(ave.tipoIdentificacion || '');
            this.$el.find('#identificacionCliente').val(ave.identificacionCliente || '');
            this.$el.find('#nombreCliente').val(ave.nombreCliente || '');
            this.$el.find('#correoCliente').val(ave.correoCliente || '');
            this.$el.find('#telefonoCliente').val(ave.telefonoCliente || '');
            
            // Pestaña 2 — Inmueble
            this.inmuebleManager.inicializarBuscador();
            if (data.inmueble) {
                this.inmuebleManager.mostrarInmueble(data.inmueble);
            }
            
            // Pestaña 3 — Situación Legal
            this.poblarLegal(ave);
            
            // Pestañas 4 y 5 — Referencias
            this.referenciasManager.cargar(data.referencias || []);
            
            // Pestaña 6 — FODA
            this.fodaManager.cargar(data.analisis || []);
            
            // Pestañas 7, 9, 10, 11 — Items
            this.factoresManager.cargarItems(data.factores || []);
            this.decisionesManager.cargarItems(data.decisiones || []);
            this.canalesManager.cargarItems(data.canales || []);
            this.planesManager.cargarItems(data.planes || []);
            
            // Pestaña 8 — Precios
            this.precioManager.poblar(ave);
        },

        // ─────────────────────────────────────────────────────────────
        // Pestaña 3 — Legal
        // ─────────────────────────────────────────────────────────────
        poblarLegal: function (ave) {
            var campos = [
                { chk: 'chk-cedulaCatastral',   nota: 'nota-cedCatNota',   val: 'cedCatNota',   bool: 'cedulaCatastral' },
                { chk: 'chk-registroPropiedad',  nota: 'nota-regProNota',   val: 'regProNota',   bool: 'registroPropiedad' },
                { chk: 'chk-solvenciaMunicipal', nota: 'nota-solMunNota',   val: 'solMunNota',   bool: 'solvenciaMunicipal' },
                { chk: 'chk-comentarioLegal',    nota: 'nota-comLegNota',   val: 'comLegNota',   bool: 'comentarioLegal' }
            ];
            
            campos.forEach(function (c) {
                var checked = !!ave[c.bool];
                this.$el.find('#' + c.chk).prop('checked', checked);
                if (checked) {
                    this.$el.find('#' + c.nota).show();
                    this.$el.find('#' + c.val).val(ave[c.val] || '');
                } else {
                    this.$el.find('#' + c.nota).hide();
                }
            }.bind(this));
        },

        toggleNotaLegal: function (e) {
            var $chk = $(e.currentTarget);
            var notaId = $chk.data('nota');
            var $nota = this.$el.find('#' + notaId);
            if ($chk.is(':checked')) {
                $nota.slideDown(200);
            } else {
                $nota.slideUp(200);
            }
        },

        // ─────────────────────────────────────────────────────────────
        // Toggle panel
        // ─────────────────────────────────────────────────────────────
        togglePanel: function (e) {
            var $header = $(e.currentTarget);
            var $body = $header.closest('.ave-panel').find('.ave-panel-body');
            var $icon = $header.find('.fa-chevron-down, .fa-chevron-up');
            
            if ($body.is(':visible')) {
                $body.slideUp('fast');
                $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                $header.removeClass('active');
            } else {
                $body.slideDown('fast');
                $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                $header.addClass('active');
            }
        },

        // ─────────────────────────────────────────────────────────────
        // Validar email
        // ─────────────────────────────────────────────────────────────
        validarEmail: function () {
            var email = this.$el.find('#correoCliente').val().trim();
            var $help = this.$el.find('#emailHelp');
            var regex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
            if (email && !regex.test(email)) {
                $help.show();
                return false;
            } else {
                $help.hide();
                return true;
            }
        },

        // ─────────────────────────────────────────────────────────────
        // Guardar
        // ─────────────────────────────────────────────────────────────
        guardar: function () {
            var self = this;

            // Validar nombre
            var nombreCliente = this.$el.find('#nombreCliente').val().trim();
            if (!nombreCliente) {
                Espo.Ui.warning('El nombre del cliente es requerido');
                this.tabsManager.activarTab('tab-1');
                this.$el.find('#nombreCliente').focus();
                return;
            }

            // Validar correo si está presente
            var email = this.$el.find('#correoCliente').val().trim();
            if (email && !this.validarEmail()) {
                Espo.Ui.warning('Ingrese un correo electrónico válido');
                this.tabsManager.activarTab('tab-1');
                this.$el.find('#correoCliente').focus();
                return;
            }

            var $btn = this.$el.find('[data-action="guardar"]');
            var orig = $btn.html();
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Guardando...');

            var payload = {
                aveId: this.aveId,
                datosGenerales: {
                    numeroAve: this.$el.find('#numeroAve').val(),
                    tipoIdentificacion: this.$el.find('#tipoIdentificacion').val(),
                    identificacionCliente: this.$el.find('#identificacionCliente').val(),
                    nombreCliente: nombreCliente,
                    correoCliente: email,
                    telefonoCliente: this.$el.find('#telefonoCliente').val()
                },
                aveInmuebleId: this.inmuebleManager.getInmuebleId(),
                legal: {
                    cedulaCatastral: this.$el.find('#chk-cedulaCatastral').is(':checked'),
                    cedCatNota: this.$el.find('#cedCatNota').val(),
                    registroPropiedad: this.$el.find('#chk-registroPropiedad').is(':checked'),
                    regProNota: this.$el.find('#regProNota').val(),
                    solvenciaMunicipal: this.$el.find('#chk-solvenciaMunicipal').is(':checked'),
                    solMunNota: this.$el.find('#solMunNota').val(),
                    comentarioLegal: this.$el.find('#chk-comentarioLegal').is(':checked'),
                    comLegNota: this.$el.find('#comLegNota').val()
                },
                referencias: this.referenciasManager.getData(),
                analisis: this.fodaManager.getData(),
                factores: this.factoresManager.getData(),
                decisiones: this.decisionesManager.getData(),
                canales: this.canalesManager.getData(),
                planes: this.planesManager.getData(),
                precio: {
                    valorMax: parseFloat(this.$el.find('#valorMax').val()) || null,
                    precioMax: parseFloat(this.$el.find('#precioMax').val()) || null,
                    valorMin: parseFloat(this.$el.find('#valorMin').val()) || null,
                    precioMin: parseFloat(this.$el.find('#precioMin').val()) || null,
                    valorPromedio: parseFloat(this.$el.find('#valorPromedio').val()) || null,
                    precioOriginal: parseFloat(this.$el.find('#precioOriginal').val()) || null,
                    precioSugerido: parseFloat(this.$el.find('#precioSugerido').val()) || null,
                    ajustePrecio: parseFloat(this.$el.find('#ajustePrecio').val()) || 0,
                    pesoOfertas: parseFloat(this.$el.find('#pesoOfertas').val())
                }
            };

            console.log('Payload a enviar:', payload);
            console.log('Precio payload:', payload.precio);

            Espo.Ajax.postRequest('AvePrincipal/action/guardar', payload)
                .then(function (response) {
                    if (response.success) {
                        Espo.Ui.success('AVE guardado correctamente');
                        self.$el.find('#ave-subtitle').text(payload.datosGenerales.numeroAve || 'Sin número asignado');
                    } else {
                        Espo.Ui.error(response.error || 'Error al guardar');
                    }
                })
                .catch(function (error) {
                    console.error('Error en la petición:', error);
                    Espo.Ui.error('Error al guardar el AVE');
                })
                .finally(function () {
                    $btn.prop('disabled', false).html(orig);
                });
        },

        // ─────────────────────────────────────────────────────────────
        // Helper escape
        // ─────────────────────────────────────────────────────────────
        escape: function (text) {
            if (!text) return '';
            return String(text).replace(/[&<>"']/g, function (m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        },

        data: function () {
            return {};
        }
    });
});