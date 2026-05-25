define('ave:views/ave-principal/modules/inmueble', [], function () {

    var InmuebleManager = function (view) {
        this.view = view;
        this.inmuebleId = null;
        this.inmuebleActual = null;
        this._searchTimer = null;
    };

    // ─────────────────────────────────────────────
    // Inicializar buscador y eventos
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.inicializarBuscador = function () {
        var self = this;
        var $input = this.view.$el.find('#inmueble-search-input');
        var $dropdown = this.view.$el.find('#inmueble-search-results');

        $input.off('input').on('input', function () {
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

        // Cerrar dropdown al hacer clic fuera
        $(document).off('click.ave-inmueble').on('click.ave-inmueble', function (e) {
            if (!$(e.target).closest('.ave-search-input-wrapper').length) {
                $dropdown.hide();
            }
        });

        // Botones del modal
        this.view.$el.find('#btn-guardar-inmueble').off('click').on('click', function () {
            self.guardarDesdeModal();
        });

        // Botón Editar en la tarjeta del inmueble seleccionado
        this.view.$el.find('[data-action="editar-inmueble"]').off('click').on('click', function () {
            if (self.inmuebleActual) {
                self.abrirModalEditar(self.inmuebleActual);
            }
        });
    };

    // ─────────────────────────────────────────────
    // Búsqueda de inmuebles
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.buscar = function (q, $dropdown) {
        var self = this;
        $dropdown.html('<div class="ave-search-loading"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>').show();

        Espo.Ajax.getRequest('AvePrincipal/action/buscarInmueble', { q: q, teamId: this.view.teamId })
            .then(function (response) {
                if (!response.success || !response.data.length) {
                    $dropdown.html('<div class="ave-search-no-results">No se encontraron inmuebles</div>');
                    return;
                }
                var html = '';
                response.data.forEach(function (item) {
                    html += '<div class="ave-search-item" data-id="' + item.id + '">';
                    html += '<div class="ave-search-item-main">' + self.escape(item.nombrePropietario) + '</div>';
                    html += '<div class="ave-search-item-sub">' + (item.referencia ? '[' + self.escape(item.referencia) + '] ' : '') + self.escape(item.tipoPropiedad || '') + ' — ' + self.escape(item.ciudad || '') + '</div>';
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
    // Selección y visualización del inmueble
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.seleccionarInmueble = function (data) {
        this.inmuebleId = data.id;
        this.inmuebleActual = data;
        this.mostrarInmueble(data);
    };

    InmuebleManager.prototype.mostrarInmueble = function (data) {
        this.inmuebleId = data.id;
        this.inmuebleActual = data;

        this.view.$el.find('#inm-nombre-propietario').text(data.nombrePropietario || '-');
        this.view.$el.find('#inm-referencia').text(data.referencia || '-');
        this.view.$el.find('#inm-tipo').text(this.formatTipo(data.tipoPropiedad) || '-');
        this.view.$el.find('#inm-subtipo').text(this.formatSubtipo(data.subtipoPropiedad) || '-');
        this.view.$el.find('#inm-area').text(data.areaConstruida ? data.areaConstruida + ' m²' : '-');
        this.view.$el.find('#inm-area-terreno').text(data.areaTerreno ? data.areaTerreno + ' m²' : '-');
        this.view.$el.find('#inm-hab-ban').text((data.numHabitaciones || '-') + ' hab / ' + (data.numBanos || '-') + ' baños');
        var ubicacion = [data.urbanizacion, data.ciudad, data.estado].filter(Boolean).join(', ');
        this.view.$el.find('#inm-ubicacion').text(ubicacion || '-');

        this.view.$el.find('#inmueble-seleccionado').show();
        this.view.$el.find('#inmueble-vacio').hide();
    };

    InmuebleManager.prototype.limpiarSeleccion = function () {
        this.inmuebleId = null;
        this.inmuebleActual = null;
        this.view.$el.find('#inmueble-seleccionado').hide();
        this.view.$el.find('#inmueble-vacio').show();
        this.view.$el.find('#inmueble-search-input').val('').focus();
    };

    // Formateadores para mostrar textos amigables
    InmuebleManager.prototype.formatTipo = function (tipo) {
        var map = {
            habitacional: 'Habitacional',
            comercial: 'Comercial',
            industrial: 'Industrial',
            vacacional: 'Vacacional',
            terreno: 'Terreno'
        };
        return map[tipo] || tipo || '-';
    };

    InmuebleManager.prototype.formatSubtipo = function (subtipo) {
        if (!subtipo) return '-';
        // Puedes hacer un mapeo más legible si lo deseas
        return subtipo.replace(/-/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    };

    // ─────────────────────────────────────────────
    // Modal para nuevo inmueble
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.abrirModalNuevo = function () {
        this.limpiarModal();
        this.view.$el.find('#modalInmueble').modal('show');
    };

    InmuebleManager.prototype.abrirModalEditar = function (inmueble) {
        this.llenarModal(inmueble);
        this.view.$el.find('#modalInmueble').modal('show');
    };

    // ─────────────────────────────────────────────
    // Limpiar campos del modal
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.limpiarModal = function () {
        this.view.$el.find('#inm-m-id').val('');
        this.view.$el.find('#inm-m-nombrePropietario').val('');
        this.view.$el.find('#inm-m-tipoPropiedad').val('');
        this.view.$el.find('#inm-m-subtipoPropiedad').val('');
        this.view.$el.find('#inm-m-estado').val('');
        this.view.$el.find('#inm-m-municipio').val('');
        this.view.$el.find('#inm-m-parroquia').val('');
        this.view.$el.find('#inm-m-ciudad').val('');
        this.view.$el.find('#inm-m-urbanizacion').val('');
        this.view.$el.find('#inm-m-avenidaCalle').val('');
        this.view.$el.find('#inm-m-edificioCasa').val('');
        this.view.$el.find('#inm-m-areaConstruida').val('');
        this.view.$el.find('#inm-m-areaTerreno').val('');
        this.view.$el.find('#inm-m-antiguedad').val('');
        this.view.$el.find('#inm-m-numHabitaciones').val('');
        this.view.$el.find('#inm-m-numBanos').val('');
        this.view.$el.find('#inm-m-puestoEstacionamiento').val('');
        this.view.$el.find('#inm-m-piso').val('');
        this.view.$el.find('#inm-m-servicios').val('');
        this.view.$el.find('#inm-m-seguridad').val('');
        this.view.$el.find('#inm-m-ascensores').prop('checked', false);
        this.view.$el.find('#inm-m-terraza').prop('checked', false);
        this.view.$el.find('#inm-m-descripcion').val('');
    };

    // ─────────────────────────────────────────────
    // Llenar modal con datos de un inmueble existente
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.llenarModal = function (inmueble) {
        this.view.$el.find('#inm-m-id').val(inmueble.id);
        this.view.$el.find('#inm-m-nombrePropietario').val(inmueble.nombrePropietario || '');
        this.view.$el.find('#inm-m-tipoPropiedad').val(inmueble.tipoPropiedad || '');
        this.view.$el.find('#inm-m-subtipoPropiedad').val(inmueble.subtipoPropiedad || '');
        this.view.$el.find('#inm-m-estado').val(inmueble.estado || '');
        this.view.$el.find('#inm-m-municipio').val(inmueble.municipio || '');
        this.view.$el.find('#inm-m-parroquia').val(inmueble.parroquia || '');
        this.view.$el.find('#inm-m-ciudad').val(inmueble.ciudad || '');
        this.view.$el.find('#inm-m-urbanizacion').val(inmueble.urbanizacion || '');
        this.view.$el.find('#inm-m-avenidaCalle').val(inmueble.avenidaCalle || '');
        this.view.$el.find('#inm-m-edificioCasa').val(inmueble.edificioCasa || '');
        this.view.$el.find('#inm-m-areaConstruida').val(inmueble.areaConstruida || '');
        this.view.$el.find('#inm-m-areaTerreno').val(inmueble.areaTerreno || '');
        this.view.$el.find('#inm-m-antiguedad').val(inmueble.antiguedad || '');
        this.view.$el.find('#inm-m-numHabitaciones').val(inmueble.numHabitaciones || '');
        this.view.$el.find('#inm-m-numBanos').val(inmueble.numBanos || '');
        this.view.$el.find('#inm-m-puestoEstacionamiento').val(inmueble.puestoEstacionamiento || '');
        this.view.$el.find('#inm-m-piso').val(inmueble.piso || '');
        this.view.$el.find('#inm-m-servicios').val(inmueble.servicios || '');
        this.view.$el.find('#inm-m-seguridad').val(inmueble.seguridad || '');
        this.view.$el.find('#inm-m-ascensores').prop('checked', inmueble.ascensores || false);
        this.view.$el.find('#inm-m-terraza').prop('checked', inmueble.terraza || false);
        this.view.$el.find('#inm-m-descripcion').val(inmueble.descripcion || '');
    };

    // ─────────────────────────────────────────────
    // Guardar desde modal (crear o editar)
    // ─────────────────────────────────────────────
    InmuebleManager.prototype.guardarDesdeModal = function () {
        var self = this;
        var nombrePropietario = this.view.$el.find('#inm-m-nombrePropietario').val().trim();
        if (!nombrePropietario) {
            Espo.Ui.warning('El nombre del propietario es requerido');
            this.view.$el.find('#inm-m-nombrePropietario').focus();
            return;
        }

        var $btn = this.view.$el.find('#btn-guardar-inmueble');
        var orig = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Guardando...');

        var data = {
            id: this.view.$el.find('#inm-m-id').val() || null,
            nombrePropietario: nombrePropietario,
            tipoPropiedad: this.view.$el.find('#inm-m-tipoPropiedad').val(),
            subtipoPropiedad: this.view.$el.find('#inm-m-subtipoPropiedad').val(),
            estado: this.view.$el.find('#inm-m-estado').val(),
            municipio: this.view.$el.find('#inm-m-municipio').val(),
            parroquia: this.view.$el.find('#inm-m-parroquia').val(),
            ciudad: this.view.$el.find('#inm-m-ciudad').val(),
            urbanizacion: this.view.$el.find('#inm-m-urbanizacion').val(),
            avenidaCalle: this.view.$el.find('#inm-m-avenidaCalle').val(),
            edificioCasa: this.view.$el.find('#inm-m-edificioCasa').val(),
            areaConstruida: parseFloat(this.view.$el.find('#inm-m-areaConstruida').val()) || null,
            areaTerreno: parseFloat(this.view.$el.find('#inm-m-areaTerreno').val()) || null,
            antiguedad: parseInt(this.view.$el.find('#inm-m-antiguedad').val()) || null,
            numHabitaciones: parseFloat(this.view.$el.find('#inm-m-numHabitaciones').val()) || null,
            numBanos: parseFloat(this.view.$el.find('#inm-m-numBanos').val()) || null,
            puestoEstacionamiento: parseInt(this.view.$el.find('#inm-m-puestoEstacionamiento').val()) || null,
            piso: this.view.$el.find('#inm-m-piso').val(),
            servicios: this.view.$el.find('#inm-m-servicios').val(),
            seguridad: this.view.$el.find('#inm-m-seguridad').val(),
            ascensores: this.view.$el.find('#inm-m-ascensores').is(':checked'),
            terraza: this.view.$el.find('#inm-m-terraza').is(':checked'),
            descripcion: this.view.$el.find('#inm-m-descripcion').val(),
            teamId: this.view.teamId
        };

        Espo.Ajax.postRequest('AvePrincipal/action/crearInmueble', data)
            .then(function (response) {
                if (response.success) {
                    Espo.Ui.success(data.id ? 'Inmueble actualizado correctamente' : 'Inmueble creado correctamente');
                    self.view.$el.find('#modalInmueble').modal('hide');
                    self.seleccionarInmueble(response.data);
                } else {
                    Espo.Ui.error(response.error || 'Error al guardar el inmueble');
                }
            })
            .catch(function () {
                Espo.Ui.error('Error al guardar el inmueble');
            })
            .finally(function () {
                $btn.prop('disabled', false).html(orig);
            });
    };

    // ─────────────────────────────────────────────
    // Getters y helpers
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