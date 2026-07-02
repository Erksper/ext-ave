define('ave:views/ave-principal/modules/referencias', [], function () {

    var MAX_REFS = 5;

    var ReferenciasManager = function (view) {
        this.view = view;
        this.items = { promocion: [], vendido: [] };
    };

    // Carga inicial
    ReferenciasManager.prototype.cargar = function (referencias) {
        var self = this;
        this.items = { promocion: [], vendido: [] };
        if (referencias && referencias.length) {
            referencias.forEach(function (ref) {
                var tipo = ref.tipo === 'vendido' ? 'vendido' : 'promocion';
                self.items[tipo].push(ref);
            });
        }
        this.renderizar('promocion');
        this.renderizar('vendido');
    };

    // Abrir modal
    ReferenciasManager.prototype.abrirModal = function (tipo, idx) {
        var self = this;
        var items = this.items[tipo];
        if (idx === null && items.length >= MAX_REFS) {
            Espo.Ui.warning('Máximo ' + MAX_REFS + ' referencias permitidas');
            return;
        }
        
        var titulo = tipo === 'promocion' ? 'Referencia en Promoción' : 'Referencia Vendida';
        var labelValor = tipo === 'vendido' ? 'Valor de Venta (USD)' : 'Valor Referencial (USD)';
        
        // Cambiar el título del modal
        this.view.$el.find('#modal-ref-titulo-text').text(titulo);
        this.view.$el.find('.modal-title i').attr('class', tipo === 'promocion' ? 'fas fa-tag' : 'fas fa-handshake');
        
        // Cambiar la etiqueta del campo valor referencial
        this.view.$el.find('label[for="ref-valorReferencial"]').text(labelValor);
        
        // También cambiar el placeholder si lo deseas
        this.view.$el.find('#ref-valorReferencial').attr('placeholder', labelValor);
        
        this.view.$el.find('#ref-modal-tipo').val(tipo);
        this.view.$el.find('#ref-modal-idx').val(idx !== null ? idx : '');

        if (idx !== null && items[idx]) {
            this.llenarModal(items[idx]);
        } else {
            this.limpiarModal();
        }

        this.setupCalculoM2();
        this.setupFoto();

        this.view.$el.find('#btn-guardar-referencia').off('click').on('click', function () {
            self.guardarDesdeModal();
        });

        this.view.$el.find('#modalReferencia').modal('show');
    };

    // Cálculo de $/m²
    ReferenciasManager.prototype.setupCalculoM2 = function () {
        var self = this;
        this.view.$el.find('#ref-valorReferencial, #ref-areaConstruida').off('input.ref').on('input.ref', function () {
            self.calcularM2();
        });
        this.view.$el.find('#ref-subtipoPropiedad').off('change.ref').on('change.ref', function () {
            self.actualizarEstadoAreaTerreno();
        });
        this.calcularM2();
        this.actualizarEstadoAreaTerreno();
    };

    ReferenciasManager.prototype.calcularM2 = function () {
        var precio = parseFloat(this.view.$el.find('#ref-valorReferencial').val()) || 0;
        var area = parseFloat(this.view.$el.find('#ref-areaConstruida').val()) || 0;
        var m2 = (precio > 0 && area > 0) ? (precio / area).toFixed(2) : '';
        this.view.$el.find('#ref-valorm2').val(m2);
    };

    // Actualizar estado del área de terreno según subtipo
    ReferenciasManager.prototype.actualizarEstadoAreaTerreno = function () {
        var subtipo = this.view.$el.find('#ref-subtipoPropiedad').val();
        var $areaTerreno = this.view.$el.find('#ref-areaTerreno');
        var $areaTerrenoGroup = $areaTerreno.closest('.col-md-4');
        var subtiposSinTerreno = ['apartamento', 'oficinas', 'local', 'penthouse'];
        var subtipoNormalizado = (subtipo || '').toLowerCase();
        
        // Remover mensaje existente
        $areaTerrenoGroup.find('small.text-muted').remove();
        
        if (subtiposSinTerreno.indexOf(subtipoNormalizado) !== -1) {
            $areaTerreno.prop('disabled', true);
            $areaTerreno.val('');
            $areaTerrenoGroup.css('opacity', '0.6');
            $areaTerrenoGroup.append('<small class="text-muted" style="display:block; font-size:11px;">No aplica para este tipo de propiedad</small>');
        } else {
            $areaTerreno.prop('disabled', false);
            $areaTerrenoGroup.css('opacity', '1');
        }
    };

    // Validación
    ReferenciasManager.prototype.validarCompleto = function () {
        // ── Campos requeridos ──────────────────────────────────────────
        var requeridos = [
            { id: '#ref-tipoPropiedad',    label: 'Tipo de propiedad',   tipo: 'select' },
            { id: '#ref-subtipoPropiedad', label: 'Subtipo de propiedad', tipo: 'select' },
            { id: '#ref-valorReferencial', label: 'Valor referencial',    tipo: 'number' },
            { id: '#ref-areaConstruida',   label: 'Área Construida',      tipo: 'number' },
            { id: '#ref-antiguedad',       label: 'Antigüedad',           tipo: 'number' },
        ];

        for (var i = 0; i < requeridos.length; i++) {
            var campo = requeridos[i];
            var $el = this.view.$el.find(campo.id);
            var valor = campo.tipo === 'number' ? parseFloat($el.val()) : $el.val().trim();
            var vacio = campo.tipo === 'number' ? (isNaN(valor) || valor < 0) : !valor;
            if (vacio) {
                Espo.Ui.warning(campo.label + ' es requerido');
                $el.focus();
                return false;
            }
        }

        // ── Área Terreno: requerida si el tipo incluye terreno ─────────
        var tipo = this.view.$el.find('#ref-tipoPropiedad').val();
        var subtipo = this.view.$el.find('#ref-subtipoPropiedad').val();
        var esTerreno = tipo === 'Terreno' || subtipo === 'Parcela';
        if (esTerreno) {
            var areaTerreno = parseFloat(this.view.$el.find('#ref-areaTerreno').val());
            if (isNaN(areaTerreno) || areaTerreno <= 0) {
                Espo.Ui.warning('Área de Terreno es requerida para este tipo de propiedad');
                this.view.$el.find('#ref-areaTerreno').focus();
                return false;
            }
        }

        // ── Validaciones numéricas opcionales ─────────────────────────
        var numericos = [
            { id: '#ref-areaTerreno',      label: 'Área Terreno',       minVal: 0 },
            { id: '#ref-areaConstruida',   label: 'Área Construida',    minVal: 0.01 },
            { id: '#ref-antiguedad',       label: 'Antigüedad',         minVal: 0 },
            { id: '#ref-habitaciones',     label: 'Habitaciones',       minVal: 0 },
            { id: '#ref-banos',            label: 'Baños',              minVal: 0 },
            { id: '#ref-estacionamiento',  label: 'Estacionamientos',   minVal: 0 },
            { id: '#ref-valorm2',          label: 'Valor por m²',       minVal: 0 },
            { id: '#ref-valorReferencial', label: 'Valor referencial',  minVal: 0.01 },
        ];

        for (var j = 0; j < numericos.length; j++) {
            var num = numericos[j];
            var rawVal = this.view.$el.find(num.id).val();
            if (rawVal === '') continue; // vacío es ok si no es requerido
            var numVal = parseFloat(rawVal);
            if (isNaN(numVal) || numVal < num.minVal) {
                Espo.Ui.warning(num.label + ': valor numérico inválido');
                this.view.$el.find(num.id).focus();
                return false;
            }
        }

        return true;
    };

    // Limpiar / llenar modal
    ReferenciasManager.prototype.limpiarModal = function () {
        var campos = ['ref-valorReferencial','ref-areaTerreno','ref-areaConstruida','ref-antiguedad',
            'ref-habitaciones','ref-banos','ref-estacionamiento','ref-piso','ref-valorm2','ref-descripcion','ref-enlace'];
        campos.forEach(function (id) { this.view.$el.find('#' + id).val(''); }.bind(this));
        this.view.$el.find('#ref-tipoPropiedad').val('');
        this.view.$el.find('#ref-subtipoPropiedad').val('');
        this.view.$el.find('#ref-usarCalculo').val('1');
        this.view.$el.find('#ref-acabados').val('');
        this.view.$el.find('#ref-seguridad').val('');
        this.view.$el.find('#ref-ascensores').prop('checked', false);
        this.view.$el.find('#ref-terraza').prop('checked', false);
        
        // Limpiar mensaje de área de terreno
        var $areaTerrenoGroup = this.view.$el.find('#ref-areaTerreno').closest('.col-md-4');
        $areaTerrenoGroup.find('small.text-muted').remove();
        $areaTerrenoGroup.css('opacity', '1');
        
        // Foto
        this.view.$el.find('#ref-foto').val('');
        this.view.$el.find('#ref-foto-id').val('');
        this.view.$el.find('#ref-foto-preview').hide();
        this.view.$el.find('#ref-foto-preview img').attr('src', '');
    };

    ReferenciasManager.prototype.llenarModal = function (ref) {
        var set = function (id, val) { this.view.$el.find('#' + id).val(val || ''); }.bind(this);
        set('ref-tipoPropiedad', ref.tipoPropiedad);
        set('ref-subtipoPropiedad', ref.subtipoPropiedad);
        this.view.$el.find('#ref-usarCalculo').val(ref.usarCalculo ? '1' : '0');
        set('ref-valorReferencial', ref.valorReferencial);
        set('ref-areaTerreno', ref.areaTerreno);
        set('ref-areaConstruida', ref.areaConstruida);
        set('ref-antiguedad', ref.antiguedad);
        set('ref-habitaciones', ref.habitaciones);
        set('ref-banos', ref.banos);
        set('ref-estacionamiento', ref.estacionamiento);
        set('ref-piso', ref.piso);
        set('ref-acabados', ref.acabados);
        set('ref-seguridad', ref.seguridad);
        set('ref-valorm2', ref.valorm2);
        set('ref-descripcion', ref.descripcion);
        set('ref-enlace', ref.enlace);
        this.view.$el.find('#ref-ascensores').prop('checked', !!ref.ascensores);
        this.view.$el.find('#ref-terraza').prop('checked', !!ref.terraza);
        
        if (ref.fotoId) {
            this.view.$el.find('#ref-foto-id').val(ref.fotoId);
            var imgUrl = 'api/v1/Attachment/file/' + ref.fotoId;
            this.view.$el.find('#ref-foto-preview img').attr('src', imgUrl);
            this.view.$el.find('#ref-foto-preview').show();
        } else {
            this.view.$el.find('#ref-foto-preview').hide();
        }
        
        this.calcularM2();
        this.actualizarEstadoAreaTerreno();
    };

    // Manejo de foto (subida inmediata con fetch para mayor control)
    ReferenciasManager.prototype.setupFoto = function () {
        var self = this;
        var $file    = this.view.$el.find('#ref-foto');
        var $preview = this.view.$el.find('#ref-foto-preview');
        var $img     = $preview.find('img');
        var $fotoId  = this.view.$el.find('#ref-foto-id');

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

            // Mostrar preview local inmediatamente
            var reader = new FileReader();
            reader.onload = function (ev) {
                $img.attr('src', ev.target.result);
                $preview.show();
            };
            reader.readAsDataURL(file);

            // Subir al servidor
            var formData = new FormData();
            formData.append('file', file);

            var headers = {};
            var csrfToken = document.cookie.match(/ESPO_CSRF_TOKEN=([^;]+)/);
            if (csrfToken) {
                headers['X-Csrf-Token'] = csrfToken[1];
            }
            
            fetch('api/v1/AvePrincipal/action/uploadFoto', {
                method: 'POST',
                credentials: 'same-origin',
                headers: headers,
                body: formData
            })
            .then(function (response) {
                if (!response.ok) {
                    return response.text().then(function (text) {
                        throw new Error('HTTP ' + response.status + ': ' + text);
                    });
                }
                return response.json();
            })
            .then(function (data) {
                if (data.success && data.id) {
                    $fotoId.val(data.id);
                    Espo.Ui.success('Foto cargada correctamente');
                } else {
                    Espo.Ui.error('Error al subir la foto: ' + (data.error || 'respuesta inesperada'));
                    $img.attr('src', '');
                    $preview.hide();
                    $file.val('');
                }
            })
            .catch(function (error) {
                Espo.Ui.error('Error de red al subir la foto: ' + error.message);
                $img.attr('src', '');
                $preview.hide();
                $file.val('');
            });
        });

        this.view.$el.find('#ref-foto-remove').off('click').on('click', function () {
            $file.val('');
            $preview.hide();
            $img.attr('src', '');
            $fotoId.val('');
        });
    };

    // Guardar referencia
    ReferenciasManager.prototype.guardarDesdeModal = function () {
        if (!this.validarCompleto()) return;

        var tipo = this.view.$el.find('#ref-modal-tipo').val();
        var idx = this.view.$el.find('#ref-modal-idx').val();
        idx = (idx !== '') ? parseInt(idx) : null;

        this.calcularM2();

        var ref = {
            tipo: tipo,
            tipoPropiedad: this.view.$el.find('#ref-tipoPropiedad').val(),
            subtipoPropiedad: this.view.$el.find('#ref-subtipoPropiedad').val(),
            usarCalculo: this.view.$el.find('#ref-usarCalculo').val() === '1',
            valorReferencial: parseFloat(this.view.$el.find('#ref-valorReferencial').val()) || null,
            areaTerreno: parseFloat(this.view.$el.find('#ref-areaTerreno').val()) || null,
            areaConstruida: parseFloat(this.view.$el.find('#ref-areaConstruida').val()) || null,
            antiguedad: parseInt(this.view.$el.find('#ref-antiguedad').val()) || null,
            habitaciones: parseInt(this.view.$el.find('#ref-habitaciones').val()) || null,
            banos: parseInt(this.view.$el.find('#ref-banos').val()) || null,
            estacionamiento: parseInt(this.view.$el.find('#ref-estacionamiento').val()) || null,
            piso: this.view.$el.find('#ref-piso').val(),
            acabados: this.view.$el.find('#ref-acabados').val(),
            seguridad: this.view.$el.find('#ref-seguridad').val(),
            valorm2: parseFloat(this.view.$el.find('#ref-valorm2').val()) || null,
            descripcion: this.view.$el.find('#ref-descripcion').val(),
            enlace: this.view.$el.find('#ref-enlace').val(),
            ascensores: this.view.$el.find('#ref-ascensores').is(':checked'),
            terraza: this.view.$el.find('#ref-terraza').is(':checked'),
            fotoId: this.view.$el.find('#ref-foto-id').val() || null
        };

        if (idx !== null) {
            this.items[tipo][idx] = ref;
        } else {
            this.items[tipo].push(ref);
        }

        this.renderizar(tipo);
        this.view.$el.find('#modalReferencia').modal('hide');
        Espo.Ui.success('Referencia guardada');
    };

    // Eliminar
    ReferenciasManager.prototype.eliminar = function (tipo, idx) {
        if (!confirm('¿Eliminar esta referencia?')) return;
        this.items[tipo].splice(idx, 1);
        this.renderizar(tipo);
        Espo.Ui.success('Referencia eliminada');
    };

    // Método auxiliar para campos en grid
    ReferenciasManager.prototype.fieldItem = function (label, value) {
        return '<div class="ave-ref-field-item">' +
            '<div class="ave-ref-field-label">' + label + '</div>' +
            '<div class="ave-ref-field-value">' + this.escape(String(value)) + '</div>' +
            '</div>';
    };

    // Renderizar tarjetas
    ReferenciasManager.prototype.renderizar = function (tipo) {
        var self = this;
        var items = this.items[tipo];
        var listId = tipo === 'promocion' ? 'refs-promocion-lista' : 'refs-vendido-lista';
        var badgeId = tipo === 'promocion' ? 'badge-promocion' : 'badge-vendido';
        var btnId = tipo === 'promocion' ? 'btn-add-promocion' : 'btn-add-vendido';
        var esVendido = tipo === 'vendido';
        var labelValor = esVendido ? 'Valor de Venta' : 'Valor Referencial';

        this.view.$el.find('#' + badgeId).text(items.length + ' / ' + MAX_REFS);
        var $addBtn = this.view.$el.find('#' + btnId);
        items.length >= MAX_REFS ? $addBtn.hide() : $addBtn.show();

        if (items.length === 0) {
            this.view.$el.find('#' + listId).html(
                '<div style="text-align:center; padding:40px; color:var(--ave-text-muted);">' +
                '<i class="fas fa-building" style="font-size:48px; margin-bottom:16px; display:block;"></i>' +
                'No hay referencias agregadas.' +
                '</div>'
            );
            return;
        }

        var html = '';
        items.forEach(function (ref, idx) {
            var valorReferencial = parseFloat(ref.valorReferencial) || 0;
            var areaConstruida = parseFloat(ref.areaConstruida) || 0;
            var valorM2 = areaConstruida > 0 ? (valorReferencial / areaConstruida).toFixed(2) : 0;
            var calcBadgeClass = ref.usarCalculo ? 'ave-ref-calc-si' : 'ave-ref-calc-no';
            var calcBadgeText = ref.usarCalculo ? '✓ En cálculo' : '✗ Excluida';
            var fotoUrl = ref.fotoId ? 'api/v1/Attachment/file/' + ref.fotoId : null;
            
            // Determinar si el área de terreno debe mostrarse (basado en subtipo)
            var subtipo = (ref.subtipoPropiedad || '').toLowerCase();
            var subtiposSinTerreno = ['apartamento', 'oficinas', 'local', 'penthouse'];
            var mostrarAreaTerreno = subtiposSinTerreno.indexOf(subtipo) === -1;

            html += '<div class="ave-ref-card">';
            
            // Header
            html += '<div class="ave-ref-card-header" data-action="toggle-ref-card" data-idx="' + idx + '">';
            html += '<div class="ave-ref-card-header-left">';
            html += '<span class="ave-ref-card-num">' + (idx + 1) + '</span>';
            
            if (fotoUrl) {
                html += '<img src="' + fotoUrl + '" class="ave-ref-thumb" alt="foto referencia">';
            } else {
                html += '<div class="ave-ref-thumb-empty"><i class="fas fa-image"></i></div>';
            }
            
            html += '<div class="ave-ref-card-info">';
            html += '<div class="ave-ref-card-title">';
            html += self.escape(ref.tipoPropiedad || 'Sin tipo') + ' - ' + self.escape(ref.subtipoPropiedad || 'Sin subtipo');
            html += '<span class="ave-ref-calc-badge ' + calcBadgeClass + '">' + calcBadgeText + '</span>';
            html += '</div>';
            html += '<div class="ave-ref-card-subtitle">';
            html += '<i class="fas fa-dollar-sign"></i> ' + labelValor + ': <strong>$ ' + valorReferencial.toLocaleString('es-VE') + '</strong>';
            html += ' | <i class="fas fa-chart-line"></i> USD/m²: <strong>$ ' + parseFloat(valorM2).toFixed(2) + '</strong>';
            html += '</div>';
            html += '<div class="ave-ref-areas-row">';
            html += '<span class="ave-ref-area-chip"><i class="fas fa-ruler-combined"></i> Const. <strong>' + (ref.areaConstruida ? parseFloat(ref.areaConstruida).toLocaleString('es-VE') + ' m²' : '-') + '</strong></span>';
            if (mostrarAreaTerreno) {
                html += '<span class="ave-ref-area-chip"><i class="fas fa-expand-arrows-alt"></i> Terreno <strong>' + (ref.areaTerreno ? parseFloat(ref.areaTerreno).toLocaleString('es-VE') + ' m²' : '-') + '</strong></span>';
            }
            html += '</div>';
            html += '</div>';
            html += '</div>';
            
            // Indicador de expandir
            html += '<div class="ave-ref-expand-indicator">';
            html += '<i class="fas fa-chevron-down"></i>';
            html += '<span class="expand-text">Ver detalles</span>';
            html += '</div>';
            
            // Acciones
            html += '<div class="ave-ref-card-actions">';
            html += '<button class="ave-btn ave-btn-sm" data-action="editar-ref" data-tipo="' + tipo + '" data-idx="' + idx + '"><i class="fas fa-edit"></i> Editar</button>';
            html += '<button class="ave-btn ave-btn-danger ave-btn-sm" data-action="eliminar-ref" data-tipo="' + tipo + '" data-idx="' + idx + '"><i class="fas fa-trash"></i></button>';
            html += '</div>';
            html += '</div>';
            
            // Body con foto a la izquierda y contenido a la derecha
            html += '<div class="ave-ref-card-body" id="ref-body-' + idx + '" style="display:none;">';
            html += '<div class="ave-ref-body-layout">';
            
            // Columna de la foto
            html += '<div class="ave-ref-body-foto">';
            if (fotoUrl) {
                html += '<img src="' + fotoUrl + '" alt="foto referencia">';
            } else {
                html += '<div class="ave-ref-body-foto-empty"><i class="fas fa-image" style="font-size:32px; margin-bottom:8px; display:block;"></i>Sin foto</div>';
            }
            html += '</div>';
            
            // Columna del contenido
            html += '<div class="ave-ref-body-content">';
            html += '<div class="ave-ref-fields-grid">';
            
            // Campos en grid
            html += self.fieldItem('Antigüedad', ref.antiguedad ? ref.antiguedad + ' años' : '-');
            html += self.fieldItem('Habitaciones', ref.habitaciones || '-');
            html += self.fieldItem('Baños', ref.banos || '-');
            html += self.fieldItem('Estacionamiento', ref.estacionamiento || '-');
            html += self.fieldItem('Piso', ref.piso || '-');
            html += self.fieldItem('Acabados', ref.acabados || '-');
            html += self.fieldItem('Seguridad', ref.seguridad || '-');
            html += self.fieldItem('Terraza', ref.terraza ? 'Sí' : 'No');
            html += self.fieldItem('Ascensores', ref.ascensores ? 'Sí' : 'No');
            
            html += '</div>';
            
            if (ref.descripcion) {
                html += '<div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--ave-border);">';
                html += '<div class="ave-ref-field-label">Descripción</div>';
                html += '<div class="ave-ref-field-value">' + self.escape(ref.descripcion) + '</div>';
                html += '</div>';
            }
            
            if (ref.enlace) {
                html += '<div style="margin-top:12px;">';
                html += '<div class="ave-ref-field-label">Enlace</div>';
                html += '<div class="ave-ref-field-value"><a href="' + self.escape(ref.enlace) + '" target="_blank" rel="noopener">' + self.escape(ref.enlace) + '</a></div>';
                html += '</div>';
            }
            
            html += '</div>'; // .ave-ref-body-content
            html += '</div>'; // .ave-ref-body-layout
            html += '</div>'; // .ave-ref-card-body
            html += '</div>'; // .ave-ref-card
        });

        this.view.$el.find('#' + listId).html(html);
        
        // Eventos para colapsar/expandir tarjetas con animación del ícono
        this.view.$el.find('.ave-ref-card-header').off('click').on('click', function(e) {
            // Evitar que el click en botones de editar/eliminar dispare el toggle
            if ($(e.target).closest('.ave-ref-card-actions').length) return;
            
            var $card = $(this).closest('.ave-ref-card');
            var $body = $card.find('.ave-ref-card-body');
            var $indicator = $card.find('.ave-ref-expand-indicator i');
            var $indicatorText = $card.find('.ave-ref-expand-indicator .expand-text');
            
            if ($body.is(':visible')) {
                $body.slideUp(200);
                $indicator.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                $indicatorText.text('Ver detalles');
            } else {
                $body.slideDown(200);
                $indicator.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                $indicatorText.text('Ocultar detalles');
            }
        });
    };

    ReferenciasManager.prototype.getData = function () {
        return this.items.promocion.concat(this.items.vendido);
    };

    ReferenciasManager.prototype.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return ReferenciasManager;
});