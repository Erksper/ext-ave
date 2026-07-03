define('ave:views/ave-principal/modules/inmueble', [], function () {

    var InmuebleManager = function (view) {
        this.view = view;
        this.inmuebleId = null;
        this.inmuebleActual = null;
        this._searchTimer = null;
    };

    // ─────────────────────────────────────────────────────────────
    // Setup de eventos y configuración
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.setup = function () {
        var self = this;

        this.view.$el.find('#inm-m-subtipoPropiedad').off('change.inmueble').on('change.inmueble', function () {
            self.actualizarEstadoAreaTerreno();
        });
    };

    // ─────────────────────────────────────────────────────────────
    // Manejar habilitación/deshabilitación del área de terreno
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.actualizarEstadoAreaTerreno = function () {
        var subtipo = this.view.$el.find('#inm-m-subtipoPropiedad').val();
        var $areaTerreno = this.view.$el.find('#inm-m-areaTerreno');
        var $areaTerrenoGroup = $areaTerreno.closest('.col-md-3');

        var subtiposSinTerreno = ['departamento', 'oficinas', 'local', 'penthouse'];

        $areaTerrenoGroup.find('small.text-muted').remove();

        if (subtiposSinTerreno.indexOf(subtipo) !== -1) {
            $areaTerreno.prop('disabled', true).val('');
            $areaTerrenoGroup.css('opacity', '0.6');
            $areaTerrenoGroup.append('<small class="text-muted" style="display:block; font-size:11px;">No aplica para este tipo de propiedad</small>');
        } else {
            $areaTerreno.prop('disabled', false);
            $areaTerrenoGroup.css('opacity', '1');
        }
    };

    // ─────────────────────────────────────────────────────────────
    // Inicializar buscador
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.inicializarBuscador = function () {
        var self = this;
        var $input    = this.view.$el.find('#inmueble-search-input');
        var $dropdown = this.view.$el.find('#inmueble-search-results');

        $input.off('input').on('input', function () {
            clearTimeout(self._searchTimer);
            var q = $(this).val().trim();
            if (q.length < 2) { $dropdown.hide(); return; }
            self._searchTimer = setTimeout(function () {
                self.buscar(q, $dropdown);
            }, 300);
        });

        $(document).off('click.ave-inmueble').on('click.ave-inmueble', function (e) {
            if (!$(e.target).closest('.ave-search-input-wrapper').length) {
                $dropdown.hide();
            }
        });

        this.view.$el.find('#btn-guardar-inmueble').off('click').on('click', function () {
            self.guardarDesdeModal();
        });

        this.view.$el.find('[data-action="editar-inmueble"]').off('click').on('click', function () {
            if (self.inmuebleActual) {
                self.abrirModalEditar(self.inmuebleActual);
            }
        });

        this.view.$el.find('#modalInmueble').off('show.bs.modal').on('show.bs.modal', function () {
            self.setupFoto();
            self.setup();
        });

        this.setup();
    };

    // ─────────────────────────────────────────────────────────────
    // Setup de foto (subida y preview)
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.setupFoto = function () {
        var self    = this;
        var $file   = this.view.$el.find('#inm-m-foto');
        var $prev   = this.view.$el.find('#inm-m-foto-preview');
        var $img    = $prev.find('img');
        var $fotoId = this.view.$el.find('#inm-m-foto-id');

        $file.off('change').on('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                Espo.Ui.warning('Solo se permiten imágenes');
                $file.val('');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                Espo.Ui.warning('La imagen no debe superar los 2MB');
                $file.val('');
                return;
            }

            var reader = new FileReader();
            reader.onload = function (ev) {
                $img.attr('src', ev.target.result);
                $prev.show();
            };
            reader.readAsDataURL(file);

            var formData = new FormData();
            formData.append('file', file);

            var headers = {};
            var csrfToken = document.cookie.match(/ESPO_CSRF_TOKEN=([^;]+)/);
            if (csrfToken) headers['X-Csrf-Token'] = csrfToken[1];

            fetch('api/v1/AvePrincipal/action/uploadFoto', {
                method: 'POST',
                credentials: 'same-origin',
                headers: headers,
                body: formData
            })
            .then(function (r) {
                if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ': ' + t); });
                return r.json();
            })
            .then(function (data) {
                if (data.success && data.id) {
                    $fotoId.val(data.id);
                    Espo.Ui.success('Foto cargada');
                } else {
                    Espo.Ui.error('Error al subir la foto: ' + (data.error || ''));
                    $img.attr('src', ''); $prev.hide(); $file.val('');
                }
            })
            .catch(function (err) {
                Espo.Ui.error('Error de red: ' + err.message);
                $img.attr('src', ''); $prev.hide(); $file.val('');
            });
        });

        this.view.$el.find('#inm-m-foto-remove').off('click').on('click', function () {
            $file.val('');
            $prev.hide();
            $img.attr('src', '');
            $fotoId.val('');
        });
    };

    // ─────────────────────────────────────────────────────────────
    // Búsqueda de inmuebles
    // ─────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────
    // Selección y visualización del inmueble
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.seleccionarInmueble = function (data) {
        this.inmuebleId = data.id;
        this.inmuebleActual = data;
        this.mostrarInmueble(data);
    };

    InmuebleManager.prototype.mostrarInmueble = function (data) {
        this.inmuebleId     = data.id;
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

        var $fotoEl = this.view.$el.find('#inm-card-foto');
        if (data.fotoId) {
            $fotoEl.html('<img src="api/v1/Attachment/file/' + data.fotoId + '" class="ave-inm-card-foto" alt="foto inmueble">');
        } else {
            $fotoEl.html('<div class="ave-inm-card-foto-empty"><i class="fas fa-image"></i><span>Sin foto</span></div>');
        }

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

    // ─────────────────────────────────────────────────────────────
    // Formateadores
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.formatTipo = function (tipo) {
        var map = {
            departamento: 'Departamento',
            casa:         'Casa',
            comercial:    'Comercial',
            industrial:   'Industrial',
            vacacional:   'Vacacional',
            terreno:      'Terreno'
        };
        return map[tipo] || tipo || '-';
    };

    InmuebleManager.prototype.formatSubtipo = function (subtipo) {
        if (!subtipo) return '-';
        var map = {
            apartamento:           'Apartamento',
            casa:                  'Casa',
            'town-house':          'Town-House',
            terreno:               'Terreno',
            edificio:              'Edificio',
            oficinas:              'Oficinas',
            local:                 'Local',
            penthouse:             'Penthouse',
            galpon:                'Galpón',
            quinta:                'Quinta',
            hacienda:              'Hacienda',
            deposito:              'Depósito',
            'hotel-posada':        'Hotel/Posada',
            'fondo-de-comercio':   'Fondo de comercio',
            negocio:               'Negocio',
            'casa-bote':           'Casa bote',
            clinica:               'Clínica',
            fabrica:               'Fábrica',
            finca:                 'Finca',
            club:                  'Club',
            'tiempo-compartido':   'Tiempo compartido',
            nave:                  'Nave',
            'casa-duplex':         'Casa dúplex',
            bodega:                'Bodega',
            'inmueble-productivo': 'Inmueble productivo',
            rancho:                'Rancho',
            fraccionamiento:       'Fraccionamiento'
        };
        if (subtipo === 'departamento') return 'Apartamento';
        return map[subtipo] || subtipo.replace(/-/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); });
    };

    // ─────────────────────────────────────────────────────────────
    // Modal para nuevo / editar inmueble
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.abrirModalNuevo = function () {
        this.limpiarModal();
        this.view.$el.find('#modalInmueble').modal('show');
    };

    InmuebleManager.prototype.abrirModalEditar = function (inmueble) {
        this.llenarModal(inmueble);
        this.view.$el.find('#modalInmueble').modal('show');
    };

    // ─────────────────────────────────────────────────────────────
    // Limpiar campos del modal
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.limpiarModal = function () {
        var campos = [
            '#inm-m-id', '#inm-m-nombrePropietario', '#inm-m-tipoPropiedad',
            '#inm-m-subtipoPropiedad', '#inm-m-estado', '#inm-m-municipio',
            '#inm-m-parroquia', '#inm-m-ciudad', '#inm-m-urbanizacion',
            '#inm-m-avenidaCalle', '#inm-m-edificioCasa', '#inm-m-areaConstruida',
            '#inm-m-areaTerreno', '#inm-m-antiguedad', '#inm-m-numHabitaciones',
            '#inm-m-numBanos', '#inm-m-puestoEstacionamiento', '#inm-m-piso',
            '#inm-m-servicios', '#inm-m-seguridad', '#inm-m-descripcion',
            '#inm-m-foto', '#inm-m-foto-id'
        ];
        var self = this;
        campos.forEach(function (sel) { self.view.$el.find(sel).val(''); });

        this.view.$el.find('#inm-m-ascensores').prop('checked', false);
        this.view.$el.find('#inm-m-terraza').prop('checked', false);
        this.view.$el.find('#inm-m-foto-preview').hide();
        this.view.$el.find('#inm-m-foto-preview img').attr('src', '');

        var $areaTerrenoGroup = this.view.$el.find('#inm-m-areaTerreno').closest('.col-md-3');
        $areaTerrenoGroup.find('small.text-muted').remove();
        $areaTerrenoGroup.css('opacity', '1');
    };

    // ─────────────────────────────────────────────────────────────
    // Llenar modal con datos de un inmueble existente
    // ─────────────────────────────────────────────────────────────
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

        if (inmueble.fotoId) {
            this.view.$el.find('#inm-m-foto-id').val(inmueble.fotoId);
            this.view.$el.find('#inm-m-foto-preview img').attr('src', 'api/v1/Attachment/file/' + inmueble.fotoId);
            this.view.$el.find('#inm-m-foto-preview').show();
        } else {
            this.view.$el.find('#inm-m-foto-id').val('');
            this.view.$el.find('#inm-m-foto-preview').hide();
            this.view.$el.find('#inm-m-foto-preview img').attr('src', '');
        }

        this.actualizarEstadoAreaTerreno();
    };

    // ─────────────────────────────────────────────────────────────
    // Guardar desde modal (crear o editar)
    // ─────────────────────────────────────────────────────────────
    InmuebleManager.prototype.guardarDesdeModal = function () {
        var self = this;

        // ── Campos requeridos ──────────────────────────────────────────
        var requeridos = [
            { id: '#inm-m-nombrePropietario', label: 'Nombre del propietario',   tipo: 'text' },
            { id: '#inm-m-tipoPropiedad',     label: 'Tipo de propiedad',        tipo: 'select' },
            { id: '#inm-m-subtipoPropiedad',  label: 'Subtipo de propiedad',     tipo: 'select' },
            { id: '#inm-m-estado',            label: 'Estado',                   tipo: 'text' },
            { id: '#inm-m-municipio',         label: 'Municipio',                tipo: 'text' },
            { id: '#inm-m-ciudad',            label: 'Ciudad',                   tipo: 'text' },
            { id: '#inm-m-urbanizacion',      label: 'Urbanización / Sector',    tipo: 'text' },
            { id: '#inm-m-avenidaCalle',      label: 'Avenida / Calle',          tipo: 'text' },
            { id: '#inm-m-edificioCasa',      label: 'Edificio / C.C. / Casa',   tipo: 'text' },
            { id: '#inm-m-areaConstruida',    label: 'Área Construida',          tipo: 'number' },
            { id: '#inm-m-antiguedad',        label: 'Antigüedad',               tipo: 'number' },
        ];

        for (var i = 0; i < requeridos.length; i++) {
            var campo = requeridos[i];
            var $el   = this.view.$el.find(campo.id);
            var valor = campo.tipo === 'number' ? parseFloat($el.val()) : $el.val().trim();
            var vacio = campo.tipo === 'number' ? (isNaN(valor) || valor < 0) : !valor;
            if (vacio) {
                Espo.Ui.warning(campo.label + ' es requerido');
                $el.focus();
                return;
            }
        }

        // ── Validaciones numéricas opcionales ─────────────────────────
        var numericos = [
            { id: '#inm-m-areaConstruida',        label: 'Área Construida',  minVal: 0.01, opcional: false },
            { id: '#inm-m-areaTerreno',           label: 'Área de Terreno',  minVal: 0,    opcional: true },
            { id: '#inm-m-antiguedad',            label: 'Antigüedad',       minVal: 0,    opcional: false },
            { id: '#inm-m-numHabitaciones',       label: 'Habitaciones',     minVal: 0,    opcional: true },
            { id: '#inm-m-numBanos',              label: 'Baños',            minVal: 0,    opcional: true },
            { id: '#inm-m-puestoEstacionamiento', label: 'Estacionamiento',  minVal: 0,    opcional: true },
        ];

        for (var j = 0; j < numericos.length; j++) {
            var num    = numericos[j];
            var rawVal = this.view.$el.find(num.id).val();
            if (num.opcional && rawVal === '') continue;
            var numVal = parseFloat(rawVal);
            if (isNaN(numVal) || numVal < num.minVal) {
                Espo.Ui.warning(num.label + ': debe ser un número válido' + (num.minVal > 0 ? ' mayor a 0' : ''));
                this.view.$el.find(num.id).focus();
                return;
            }
        }

        // ── Guardar ───────────────────────────────────────────────────
        var $btn = this.view.$el.find('#btn-guardar-inmueble');
        var orig = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Guardando...');

        var data = {
            id:                    this.view.$el.find('#inm-m-id').val() || null,
            nombrePropietario:     this.view.$el.find('#inm-m-nombrePropietario').val().trim(),
            tipoPropiedad:         this.view.$el.find('#inm-m-tipoPropiedad').val(),
            subtipoPropiedad:      this.view.$el.find('#inm-m-subtipoPropiedad').val(),
            estado:                this.view.$el.find('#inm-m-estado').val(),
            municipio:             this.view.$el.find('#inm-m-municipio').val(),
            parroquia:             this.view.$el.find('#inm-m-parroquia').val(),
            ciudad:                this.view.$el.find('#inm-m-ciudad').val(),
            urbanizacion:          this.view.$el.find('#inm-m-urbanizacion').val(),
            avenidaCalle:          this.view.$el.find('#inm-m-avenidaCalle').val(),
            edificioCasa:          this.view.$el.find('#inm-m-edificioCasa').val(),
            areaConstruida:        parseFloat(this.view.$el.find('#inm-m-areaConstruida').val()) || null,
            areaTerreno:           parseFloat(this.view.$el.find('#inm-m-areaTerreno').val())   || null,
            antiguedad:            parseInt(this.view.$el.find('#inm-m-antiguedad').val())       || null,
            numHabitaciones:       parseFloat(this.view.$el.find('#inm-m-numHabitaciones').val())       || null,
            numBanos:              parseFloat(this.view.$el.find('#inm-m-numBanos').val())              || null,
            puestoEstacionamiento: parseInt(this.view.$el.find('#inm-m-puestoEstacionamiento').val())   || null,
            piso:                  this.view.$el.find('#inm-m-piso').val(),
            servicios:             this.view.$el.find('#inm-m-servicios').val(),
            seguridad:             this.view.$el.find('#inm-m-seguridad').val(),
            ascensores:            this.view.$el.find('#inm-m-ascensores').is(':checked'),
            terraza:               this.view.$el.find('#inm-m-terraza').is(':checked'),
            descripcion:           this.view.$el.find('#inm-m-descripcion').val(),
            fotoId:                this.view.$el.find('#inm-m-foto-id').val() || null,
            teamId:                this.view.teamId
        };

        Espo.Ajax.postRequest('AvePrincipal/action/crearInmueble', data)
            .then(function (response) {
                if (response.success) {
                    Espo.Ui.success(data.id ? 'Inmueble actualizado' : 'Inmueble creado');
                    self.view.$el.find('#modalInmueble').modal('hide');

                    // Actualizar estado interno ANTES de llamar mostrarInmueble,
                    // para que verificarInmueble (dentro del wrapper) lea el valor correcto
                    self.view.inmuebleManager.inmuebleId     = response.data.id;
                    self.view.inmuebleManager.inmuebleActual = response.data;

                    // Llamar al wrapper de afterRender (que incluye factores, precio y verificarInmueble)
                    self.view.inmuebleManager.mostrarInmueble(response.data);
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

    // ─────────────────────────────────────────────────────────────
    // Getters y helpers
    // ─────────────────────────────────────────────────────────────
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