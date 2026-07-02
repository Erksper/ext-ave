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
        
        // Evento para cuando cambia el subtipo
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
        
        // Subtipos que NO deben tener área de terreno
        var subtiposSinTerreno = ['departamento', 'oficinas', 'local', 'penthouse'];
        
        // Remover mensaje existente si hay
        $areaTerrenoGroup.find('small.text-muted').remove();
        
        if (subtiposSinTerreno.indexOf(subtipo) !== -1) {
            $areaTerreno.prop('disabled', true);
            $areaTerreno.val('');
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

        // Setup de foto y eventos al abrir el modal
        this.view.$el.find('#modalInmueble').off('show.bs.modal').on('show.bs.modal', function () {
            self.setupFoto();
            self.setup();
        });
        
        // Llamar al setup inicial
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

            // Preview local inmediato
            var reader = new FileReader();
            reader.onload = function (ev) {
                $img.attr('src', ev.target.result);
                $prev.show();
            };
            reader.readAsDataURL(file);

            // Subir al servidor
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

        // Foto en tarjeta
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

    // Formateadores para mostrar textos amigables
    InmuebleManager.prototype.formatTipo = function (tipo) {
        var map = {
            departamento: 'Departamento',
            casa: 'Casa',
            comercial: 'Comercial',
            industrial: 'Industrial',
            vacacional: 'Vacacional',
            terreno: 'Terreno'
        };
        return map[tipo] || tipo || '-';
    };

    InmuebleManager.prototype.formatSubtipo = function (subtipo) {
        if (!subtipo) return '-';
        var map = {
            apartamento: 'Apartamento',
            casa: 'Casa',
            'town-house': 'Town-House',
            terreno: 'Terreno',
            edificio: 'Edificio',
            oficinas: 'Oficinas',
            local: 'Local',
            penthouse: 'Penthouse',
            galpon: 'Galpón',
            quinta: 'Quinta',
            hacienda: 'Hacienda',
            deposito: 'Depósito',
            'hotel-posada': 'Hotel/Posada',
            'fondo-de-comercio': 'Fondo de comercio',
            negocio: 'Negocio',
            'casa-bote': 'Casa bote',
            clinica: 'Clínica',
            fabrica: 'Fábrica',
            finca: 'Finca',
            club: 'Club',
            'tiempo-compartido': 'Tiempo compartido',
            nave: 'Nave',
            'casa-duplex': 'Casa dúplex',
            bodega: 'Bodega',
            'inmueble-productivo': 'Inmueble productivo',
            rancho: 'Rancho',
            fraccionamiento: 'Fraccionamiento'
        };
        // Si el subtipo es "departamento" (valor antiguo), mapearlo a Apartamento
        if (subtipo === 'departamento') {
            return 'Apartamento';
        }
        return map[subtipo] || subtipo.replace(/-/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
    };

    // ─────────────────────────────────────────────────────────────
    // Modal para nuevo inmueble
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
        this.view.$el.find('#inm-m-foto').val('');
        this.view.$el.find('#inm-m-foto-id').val('');
        this.view.$el.find('#inm-m-foto-preview').hide();
        this.view.$el.find('#inm-m-foto-preview img').attr('src', '');
        
        // Limpiar el mensaje de ayuda del área de terreno
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
        
        // Foto
        if (inmueble.fotoId) {
            this.view.$el.find('#inm-m-foto-id').val(inmueble.fotoId);
            this.view.$el.find('#inm-m-foto-preview img').attr('src', 'api/v1/Attachment/file/' + inmueble.fotoId);
            this.view.$el.find('#inm-m-foto-preview').show();
        } else {
            this.view.$el.find('#inm-m-foto-id').val('');
            this.view.$el.find('#inm-m-foto-preview').hide();
            this.view.$el.find('#inm-m-foto-preview img').attr('src', '');
        }
        
        // Actualizar estado del área de terreno según el subtipo actual
        this.actualizarEstadoAreaTerreno();
    };

    // ─────────────────────────────────────────────────────────────
    // Guardar desde modal (crear o editar)
    // ─────────────────────────────────────────────────────────────
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
            id:                    this.view.$el.find('#inm-m-id').val() || null,
            nombrePropietario:     nombrePropietario,
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
            areaTerreno:           parseFloat(this.view.$el.find('#inm-m-areaTerreno').val()) || null,
            antiguedad:            parseInt(this.view.$el.find('#inm-m-antiguedad').val()) || null,
            numHabitaciones:       parseFloat(this.view.$el.find('#inm-m-numHabitaciones').val()) || null,
            numBanos:              parseFloat(this.view.$el.find('#inm-m-numBanos').val()) || null,
            puestoEstacionamiento: parseInt(this.view.$el.find('#inm-m-puestoEstacionamiento').val()) || null,
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
                    self.seleccionarInmueble(response.data);
                } else {
                    Espo.Ui.error(response.error || 'Error al guardar el inmueble');
                }
            })
            .catch(function () { Espo.Ui.error('Error al guardar el inmueble'); })
            .finally(function () { $btn.prop('disabled', false).html(orig); });
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