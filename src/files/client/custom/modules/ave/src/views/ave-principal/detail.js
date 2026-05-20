define('ave:views/ave-principal/detail', [
    'view',
    'ave:views/ave-principal/modules/tabs',
    'ave:views/ave-principal/modules/inmueble',
    'ave:views/ave-principal/modules/referencias',
    'ave:views/ave-principal/modules/foda',
    'ave:views/ave-principal/modules/factores',
    'ave:views/ave-principal/modules/decisiones',
    'ave:views/ave-principal/modules/precio',
    'ave:views/ave-principal/modules/preview'
], function (
    Dep,
    TabsManager,
    InmuebleManager,
    ReferenciasManager,
    FodaManager,
    FactoresManager,
    DecisionesManager,
    PrecioManager,
    PreviewManager
) {

    console.log('[AVE Detail View] Archivo cargado');

    return Dep.extend({

        template: 'ave:ave-principal/detail',

        // Estado global
        aveId:       null,
        aveData:     null,
        inmuebleData: null,
        teamId:      null,

        // Eventos
        events: {
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
            'click [data-action="nuevo-inmueble"]': function () {
                this.inmuebleManager.abrirModalNuevo();
            },
            'click [data-action="cambiar-inmueble"]': function () {
                this.inmuebleManager.limpiarSeleccion();
            },
            'change .ave-legal-chk': function (e) {
                this.toggleNotaLegal(e);
            },
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
            'click [data-action="nueva-foda"]': function () {
                this.fodaManager.abrirModal();
            },
            'click [data-action="eliminar-foda"]': function (e) {
                var $btn = $(e.currentTarget);
                this.fodaManager.eliminar($btn.data('tipo'), $btn.data('idx'));
            },
            'click [data-action="agregar-factor"]': function () {
                this.factoresManager.agregarDesdeSelect();
            },
            'click [data-action="nuevo-factor"]': function () {
                this.factoresManager.abrirModalNuevo();
            },
            'click [data-action="quitar-factor"]': function (e) {
                this.factoresManager.quitar($(e.currentTarget).data('idx'));
            },
            'input #valorReferencial, input #areaConstruida, input #ajustePrecio, input #precioOriginal': function () {
                this.precioManager.calcular();
            },
            'click [data-action="generar-preview"]': function () {
                this.previewManager.generar();
            },
            'click [data-action="nueva-decision"]': function () {
                this.decisionesManager.abrirModal('decicion');
            },
            'click [data-action="quitar-decision"]': function (e) {
                this.decisionesManager.quitar('decicion', $(e.currentTarget).data('idx'));
            },
            'click [data-action="agregar-canal"]': function () {
                this.decisionesManager.agregarCanalDesdeSelect();
            },
            'click [data-action="nuevo-canal"]': function () {
                this.decisionesManager.abrirModalCanal();
            },
            'click [data-action="quitar-canal"]': function (e) {
                this.decisionesManager.quitar('canal', $(e.currentTarget).data('idx'));
            },
            'click [data-action="nuevo-plan"]': function () {
                this.decisionesManager.abrirModal('plan');
            },
            'click [data-action="quitar-plan"]': function (e) {
                this.decisionesManager.quitar('plan', $(e.currentTarget).data('idx'));
            }
        },

        setup: function () {
            console.log('[AVE Detail View] setup() - aveId:', this.options.aveId);
            Dep.prototype.setup.call(this);

            this.aveId = this.options.aveId;

            if (!this.aveId) {
                console.error('[AVE Detail View] No se proporcionó ID de AVE');
                Espo.Ui.error('ID de AVE no proporcionado');
                this.getRouter().navigate('#AvePrincipal', { trigger: true });
                return;
            }

            // Inicializar managers
            this.tabsManager       = new TabsManager(this);
            this.inmuebleManager   = new InmuebleManager(this);
            this.referenciasManager= new ReferenciasManager(this);
            this.fodaManager       = new FodaManager(this);
            this.factoresManager   = new FactoresManager(this);
            this.decisionesManager = new DecisionesManager(this);
            this.precioManager     = new PrecioManager(this);
            this.previewManager    = new PreviewManager(this);

            console.log('[AVE Detail View] Managers inicializados');
        },

        afterRender: function () {
            console.log('[AVE Detail View] afterRender()');
            Dep.prototype.afterRender.call(this);
            this.cargarDatos();
        },

        cargarDatos: function () {
            console.log('[AVE Detail View] cargarDatos() iniciando para aveId:', this.aveId);
            var self = this;
            this.$el.find('#ave-detail-loading').show();
            this.$el.find('#ave-detail-content').hide();

            // Obtener team del usuario
            var user = this.getUser();
            this.teamId = (user.get('defaultTeamId') || (user.get('teamsIds') || [])[0]) || null;
            console.log('[AVE Detail View] teamId del usuario:', this.teamId);

            Espo.Ajax.getRequest('AvePrincipal/action/getOrCreate', { id: this.aveId })
                .then(function (response) {
                    console.log('[AVE Detail View] Respuesta getOrCreate:', response);
                    if (!response.success) throw new Error(response.error || 'Error al cargar');

                    self.aveData      = response.data.ave;
                    self.inmuebleData = response.data.inmueble;

                    self.$el.find('#ave-detail-loading').hide();
                    self.$el.find('#ave-detail-content').show();
                    self.$el.find('#ave-subtitle').text(
                        self.aveData.numeroAve
                            ? 'N° ' + self.aveData.numeroAve
                            : 'Sin número asignado'
                    );

                    self.poblarFormulario(response.data);
                })
                .catch(function (err) {
                    console.error('[AVE Detail View] Error en getOrCreate:', err);
                    self.$el.find('#ave-detail-loading').hide();
                    Espo.Ui.error('Error al cargar el AVE');
                    setTimeout(function () {
                        self.getRouter().navigate('#AvePrincipal', { trigger: true });
                    }, 1500);
                });
        },

        poblarFormulario: function (data) {
            console.log('[AVE Detail View] poblarFormulario() con data:', data);
            var ave = data.ave || {};

            // Pestaña 1
            this.$el.find('#numeroAve').val(ave.numeroAve || '');
            this.$el.find('#tipoIdentificacion').val(ave.tipoIdentificacion || '');
            this.$el.find('#identificacionCliente').val(ave.identificacionCliente || '');
            this.$el.find('#nombreCliente').val(ave.nombreCliente || '');
            this.$el.find('#correoCliente').val(ave.correoCliente || '');
            this.$el.find('#telefonoCliente').val(ave.telefonoCliente || '');

            // Pestaña 2
            this.inmuebleManager.inicializarBuscador();
            if (data.inmueble) {
                console.log('[AVE Detail View] Mostrando inmueble existente:', data.inmueble);
                this.inmuebleManager.mostrarInmueble(data.inmueble);
            }

            // Pestaña 3
            this.poblarLegal(ave);

            // Pestañas 4 y 5
            this.referenciasManager.cargar(data.referencias || []);

            // Pestaña 6
            this.fodaManager.cargar(data.analisis || []);

            // Pestañas 7, 9, 10, 11
            this.factoresManager.cargarCatalogo(this.teamId);
            this.decisionesManager.cargarCatalogos(this.teamId);

            this.factoresManager.cargarItems(data.factores || []);
            this.decisionesManager.cargarItems(data.decisiones || [], data.canales || [], data.planes || []);

            // Pestaña 8
            this.precioManager.poblar(ave);

            console.log('[AVE Detail View] Formulario poblado completamente');
        },

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
                }
            }.bind(this));
        },

        toggleNotaLegal: function (e) {
            var $chk  = $(e.currentTarget);
            var notaId = $chk.data('nota');
            var $nota  = this.$el.find('#' + notaId);
            if ($chk.is(':checked')) {
                $nota.slideDown(200);
            } else {
                $nota.slideUp(200);
            }
        },

        togglePanel: function (e) {
            var $header = $(e.currentTarget);
            var $body   = $header.closest('.ave-panel').find('.ave-panel-body');
            var $icon   = $header.find('.fa-chevron-down, .fa-chevron-up');

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

        guardar: function () {
            console.log('[AVE Detail View] guardar() iniciado');
            var self = this;

            if (!this.$el.find('#nombreCliente').val().trim()) {
                Espo.Ui.warning('El nombre del cliente es requerido');
                this.tabsManager.activarTab('tab-1');
                this.$el.find('#nombreCliente').focus();
                return;
            }

            var $btn  = this.$el.find('[data-action="guardar"]');
            var orig  = $btn.html();
            $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Guardando...');

            var payload = {
                aveId: this.aveId,

                datosGenerales: {
                    numeroAve:             this.$el.find('#numeroAve').val(),
                    tipoIdentificacion:    this.$el.find('#tipoIdentificacion').val(),
                    identificacionCliente: this.$el.find('#identificacionCliente').val(),
                    nombreCliente:         this.$el.find('#nombreCliente').val(),
                    correoCliente:         this.$el.find('#correoCliente').val(),
                    telefonoCliente:       this.$el.find('#telefonoCliente').val()
                },

                aveInmuebleId: this.inmuebleManager.getInmuebleId(),

                legal: {
                    cedulaCatastral:   this.$el.find('#chk-cedulaCatastral').is(':checked'),
                    cedCatNota:        this.$el.find('#cedCatNota').val(),
                    registroPropiedad: this.$el.find('#chk-registroPropiedad').is(':checked'),
                    regProNota:        this.$el.find('#regProNota').val(),
                    solvenciaMunicipal:this.$el.find('#chk-solvenciaMunicipal').is(':checked'),
                    solMunNota:        this.$el.find('#solMunNota').val(),
                    comentarioLegal:   this.$el.find('#chk-comentarioLegal').is(':checked'),
                    comLegNota:        this.$el.find('#comLegNota').val()
                },

                referencias:  this.referenciasManager.getData(),
                analisis:     this.fodaManager.getData(),
                factores:     this.factoresManager.getData(),
                decisiones:   this.decisionesManager.getData('decicion'),
                canales:      this.decisionesManager.getData('canal'),
                planes:       this.decisionesManager.getData('plan'),

                precio: {
                    valorMax:      parseFloat(this.$el.find('#valorMax').val())      || null,
                    precioMax:     parseFloat(this.$el.find('#precioMax').val())     || null,
                    valorMin:      parseFloat(this.$el.find('#valorMin').val())      || null,
                    precioMin:     parseFloat(this.$el.find('#precioMin').val())     || null,
                    valorPromedio: parseFloat(this.$el.find('#valorPromedio').val()) || null,
                    precioOriginal:parseFloat(this.$el.find('#precioOriginal').val())|| null,
                    precioSugerido:parseFloat(this.$el.find('#precioSugerido').val())|| null,
                    ajustePrecio:  parseFloat(this.$el.find('#ajustePrecio').val())  || null
                }
            };

            console.log('[AVE Detail View] Payload a enviar:', payload);

            Espo.Ajax.postRequest('AvePrincipal/action/guardar', payload)
                .then(function (response) {
                    console.log('[AVE Detail View] Respuesta guardar:', response);
                    if (response.success) {
                        Espo.Ui.success('AVE guardado correctamente');
                        self.$el.find('#ave-subtitle').text(
                            payload.datosGenerales.numeroAve
                                ? 'N° ' + payload.datosGenerales.numeroAve
                                : 'Sin número asignado'
                        );
                    } else {
                        Espo.Ui.error(response.error || 'Error al guardar');
                    }
                })
                .catch(function (error) {
                    console.error('[AVE Detail View] Error en guardar:', error);
                    Espo.Ui.error('Error al guardar el AVE');
                })
                .finally(function () {
                    $btn.prop('disabled', false).html(orig);
                });
        },

        escape: function (text) {
            if (text === null || text === undefined) return '';
            return String(text).replace(/[&<>"']/g, function (m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        },

        data: function () { return {}; }
    });
});