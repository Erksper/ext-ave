define('ave:views/ave-principal/modules/inmueble', [], function () {

    var InmuebleManager = function (view) {
        this.view          = view;
        this.inmuebleId    = null;
        this.inmuebleActual = null;
        this._searchTimer  = null;
    };

    // ─────────────────────────────────────────────
    // Inicialización del buscador
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.inicializarBuscador = function () {
        var self = this;
        var $input    = this.view.$el.find('#inmueble-search-input');
        var $dropdown = this.view.$el.find('#inmueble-search-results');

        $input.on('input', function () {
            clearTimeout(self._searchTimer);
            var q = $(this).val().trim();

            if (q.length < 2) {
                $dropdown.hide();
                return;
            }

            self._searchTimer = setTimeout(function () {
                self.buscar(q, $dropdown);
            }, 300);
        });

        // Cerrar dropdown al hacer click fuera
        $(document).on('click.ave-inmueble', function (e) {
            if (!$(e.target).closest('.ave-search-input-wrapper').length) {
                $dropdown.hide();
            }
        });

        // Guardar inmueble desde modal
        this.view.$el.find('#btn-guardar-inmueble').off('click').on('click', function () {
            self.guardarDesdeModal();
        });

        // Calcular valor m2 en modal de referencia cuando cambian precio o área
        this.view.$el.find('#ref-valorReferencial, #ref-areaConstruida').on('input', function () {
            self.calcularM2Referencia();
        });
    };

    InmuebleManager.prototype.buscar = function (q, $dropdown) {
        var self   = this;
        var teamId = this.view.teamId;

        $dropdown.html('<div class="ave-search-loading"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>').show();

        Espo.Ajax.getRequest('AvePrincipal/action/buscarInmueble', { q: q, teamId: teamId })
            .then(function (response) {
                if (!response.success || !response.data.length) {
                    $dropdown.html('<div class="ave-search-no-results">No se encontraron inmuebles</div>');
                    return;
                }

                var html = '';
                response.data.forEach(function (item) {
                    html += '<div class="ave-search-item" data-id="' + item.id + '">';
                    html += '<div class="ave-search-item-main">' + self.escape(item.nombrePropietario) + '</div>';
                    html += '<div class="ave-search-item-sub">';
                    if (item.referencia) html += '[' + self.escape(item.referencia) + '] ';
                    html += self.escape(item.tipoPropiedad || '') + ' — ' + self.escape(item.ciudad || '') + ' ' + self.escape(item.urbanizacion || '');
                    html += '</div>';
                    html += '</div>';
                });

                $dropdown.html(html);

                $dropdown.find('.ave-search-item').on('click', function () {
                    var id = $(this).data('id');
                    var itemData = response.data.find(function (d) { return d.id === id; });
                    if (itemData) {
                        self.seleccionarInmueble(itemData);
                        $dropdown.hide();
                        self.view.$el.find('#inmueble-search-input').val('');
                    }
                });
            })
            .catch(function () {
                $dropdown.html('<div class="ave-search-no-results">Error en la búsqueda</div>');
            });
    };

    // ─────────────────────────────────────────────
    // Selección y display del inmueble
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.seleccionarInmueble = function (data) {
        this.inmuebleId    = data.id;
        this.inmuebleActual = data;
        this.mostrarInmueble(data);
    };

    InmuebleManager.prototype.mostrarInmueble = function (data) {
        this.inmuebleId    = data.id;
        this.inmuebleActual = data;

        var $sel   = this.view.$el.find('#inmueble-seleccionado');
        var $vacio = this.view.$el.find('#inmueble-vacio');

        this.view.$el.find('#inm-nombre-propietario').text(data.nombrePropietario || '-');
        this.view.$el.find('#inm-referencia').text(data.referencia   || '-');
        this.view.$el.find('#inm-tipo').text(data.tipoPropiedad       || '-');
        this.view.$el.find('#inm-subtipo').text(data.subtipoPropiedad  || '-');
        this.view.$el.find('#inm-estatus').text(this.formatEstatus(data.estatus));
        this.view.$el.find('#inm-area').text(data.areaConstruida ? data.areaConstruida + ' m²' : '-');
        this.view.$el.find('#inm-hab-ban').text(
            (data.numHabitaciones || '-') + ' hab / ' + (data.numBanos || '-') + ' baños'
        );
        this.view.$el.find('#inm-ubicacion').text(
            [data.urbanizacion, data.ciudad, data.estado].filter(Boolean).join(', ') || '-'
        );

        $sel.show();
        $vacio.hide();
    };

    InmuebleManager.prototype.limpiarSeleccion = function () {
        this.inmuebleId    = null;
        this.inmuebleActual = null;
        this.view.$el.find('#inmueble-seleccionado').hide();
        this.view.$el.find('#inmueble-vacio').show();
        this.view.$el.find('#inmueble-search-input').val('').focus();
    };

    InmuebleManager.prototype.formatEstatus = function (estatus) {
        var map = { elaboracion: 'En elaboración', cerrado: 'Cerrado' };
        return map[estatus] || estatus || '-';
    };

    // ─────────────────────────────────────────────
    // Modal de nuevo inmueble
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.abrirModalNuevo = function () {
        this.limpiarModal();
        this.view.$el.find('#modalInmueble').modal('show');
    };

    InmuebleManager.prototype.limpiarModal = function () {
        var campos = [
            'inm-m-nombrePropietario', 'inm-m-estado', 'inm-m-municipio', 'inm-m-parroquia',
            'inm-m-ciudad', 'inm-m-urbanizacion', 'inm-m-avenidaCalle', 'inm-m-edificioCasa',
            'inm-m-areaConstruida', 'inm-m-antiguedad', 'inm-m-numHabitaciones',
            'inm-m-numBanos', 'inm-m-puestoEstacionamiento', 'inm-m-piso', 'inm-m-descripcion'
        ];
        campos.forEach(function (id) {
            this.view.$el.find('#' + id).val('');
        }.bind(this));
        this.view.$el.find('#inm-m-estatus').val('elaboracion');
        this.view.$el.find('#inm-m-tipoPropiedad').val('');
        this.view.$el.find('#inm-m-subtipoPropiedad').val('');
        this.view.$el.find('#inm-m-servicios').val('');
        this.view.$el.find('#inm-m-seguridad').val('');
        this.view.$el.find('#inm-m-ascensores').prop('checked', false);
        this.view.$el.find('#inm-m-terraza').prop('checked', false);
    };

    InmuebleManager.prototype.guardarDesdeModal = function () {
        var self = this;
        var nombrePropietario = this.view.$el.find('#inm-m-nombrePropietario').val().trim();

        if (!nombrePropietario) {
            Espo.Ui.warning('El nombre del propietario es requerido');
            this.view.$el.find('#inm-m-nombrePropietario').focus();
            return;
        }

        var $btn  = this.view.$el.find('#btn-guardar-inmueble');
        var orig  = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Guardando...');

        var data = {
            nombrePropietario:    nombrePropietario,
            estatus:              this.view.$el.find('#inm-m-estatus').val(),
            tipoPropiedad:        this.view.$el.find('#inm-m-tipoPropiedad').val(),
            subtipoPropiedad:     this.view.$el.find('#inm-m-subtipoPropiedad').val(),
            estado:               this.view.$el.find('#inm-m-estado').val(),
            municipio:            this.view.$el.find('#inm-m-municipio').val(),
            parroquia:            this.view.$el.find('#inm-m-parroquia').val(),
            ciudad:               this.view.$el.find('#inm-m-ciudad').val(),
            urbanizacion:         this.view.$el.find('#inm-m-urbanizacion').val(),
            avenidaCalle:         this.view.$el.find('#inm-m-avenidaCalle').val(),
            edificioCasa:         this.view.$el.find('#inm-m-edificioCasa').val(),
            areaConstruida:       parseFloat(this.view.$el.find('#inm-m-areaConstruida').val()) || null,
            antiguedad:           parseInt(this.view.$el.find('#inm-m-antiguedad').val())       || null,
            numHabitaciones:      parseFloat(this.view.$el.find('#inm-m-numHabitaciones').val())|| null,
            numBanos:             parseFloat(this.view.$el.find('#inm-m-numBanos').val())       || null,
            puestoEstacionamiento:parseInt(this.view.$el.find('#inm-m-puestoEstacionamiento').val()) || null,
            piso:                 this.view.$el.find('#inm-m-piso').val(),
            servicios:            this.view.$el.find('#inm-m-servicios').val(),
            seguridad:            this.view.$el.find('#inm-m-seguridad').val(),
            ascensores:           this.view.$el.find('#inm-m-ascensores').is(':checked'),
            terraza:              this.view.$el.find('#inm-m-terraza').is(':checked'),
            descripcion:          this.view.$el.find('#inm-m-descripcion').val(),
            teamId:               this.view.teamId
        };

        Espo.Ajax.postRequest('AvePrincipal/action/crearInmueble', data)
            .then(function (response) {
                if (response.success) {
                    Espo.Ui.success('Inmueble creado correctamente');
                    self.view.$el.find('#modalInmueble').modal('hide');
                    self.mostrarInmueble(response.data);
                } else {
                    Espo.Ui.error(response.error || 'Error al crear el inmueble');
                }
            })
            .catch(function () {
                Espo.Ui.error('Error al crear el inmueble');
            })
            .finally(function () {
                $btn.prop('disabled', false).html(orig);
            });
    };

    // ─────────────────────────────────────────────
    // Cálculo de valor m2 en modal referencia
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.calcularM2Referencia = function () {
        var precio = parseFloat(this.view.$el.find('#ref-valorReferencial').val()) || 0;
        var area   = parseFloat(this.view.$el.find('#ref-areaConstruida').val())   || 0;
        var m2     = (precio > 0 && area > 0) ? (precio / area).toFixed(2) : '';
        this.view.$el.find('#ref-valorm2').val(m2);
    };

    // ─────────────────────────────────────────────
    // Getters
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.getInmuebleId = function () {
        return this.inmuebleId;
    };

    InmuebleManager.prototype.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return InmuebleManager;
});
