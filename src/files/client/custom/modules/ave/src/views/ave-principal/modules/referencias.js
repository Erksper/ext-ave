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
        this.view.$el.find('#modal-ref-titulo').html('<i class="fas fa-tag"></i> ' + titulo + (idx !== null ? ' — Editar' : ' — Nueva'));
        this.view.$el.find('#ref-modal-tipo').val(tipo);
        this.view.$el.find('#ref-modal-idx').val(idx !== null ? idx : '');

        if (idx !== null && items[idx]) {
            this.llenarModal(items[idx]);
        } else {
            this.limpiarModal();
        }

        this.setupCalculoM2();
        this.setupFoto();   // ← Vincular eventos de foto

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
        this.calcularM2();
    };

    ReferenciasManager.prototype.calcularM2 = function () {
        var precio = parseFloat(this.view.$el.find('#ref-valorReferencial').val()) || 0;
        var area = parseFloat(this.view.$el.find('#ref-areaConstruida').val()) || 0;
        var m2 = (precio > 0 && area > 0) ? (precio / area).toFixed(2) : '';
        this.view.$el.find('#ref-valorm2').val(m2);
    };

    // Validación
    ReferenciasManager.prototype.validarArea = function () {
        var area = parseFloat(this.view.$el.find('#ref-areaConstruida').val());
        if (isNaN(area) || area <= 0) {
            Espo.Ui.warning('El área construida debe ser mayor a 0');
            this.view.$el.find('#ref-areaConstruida').focus();
            return false;
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

            // Subir al servidor — incluir credentials para la sesión de EspoCRM
            var formData = new FormData();
            formData.append('file', file);

            // Obtener el token CSRF de EspoCRM si existe
            var headers = {};
            var csrfToken = document.cookie.match(/ESPO_CSRF_TOKEN=([^;]+)/);
            if (csrfToken) {
                headers['X-Csrf-Token'] = csrfToken[1];
            }
            // EspoCRM también acepta autenticación básica por header en algunas versiones;
            // credentials: 'same-origin' cubre la sesión por cookie
            fetch('api/v1/AvePrincipal/action/uploadFoto', {
                method: 'POST',
                credentials: 'same-origin',   // ← CRÍTICO: enviar cookies de sesión
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
                    console.log('AVE: foto subida correctamente, ID:', data.id);
                    Espo.Ui.success('Foto cargada correctamente');
                } else {
                    Espo.Ui.error('Error al subir la foto: ' + (data.error || 'respuesta inesperada'));
                    console.error('AVE uploadFoto error:', data);
                    // Limpiar preview si falla
                    $img.attr('src', '');
                    $preview.hide();
                    $file.val('');
                }
            })
            .catch(function (error) {
                console.error('AVE uploadFoto fetch error:', error);
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
        if (!this.validarArea()) return;

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

    // Renderizar tarjetas (con foto, descripción, enlace)
    ReferenciasManager.prototype.renderizar = function (tipo) {
        var self = this;
        var items = this.items[tipo];
        var listId  = tipo === 'promocion' ? 'refs-promocion-lista' : 'refs-vendido-lista';
        var badgeId = tipo === 'promocion' ? 'badge-promocion'      : 'badge-vendido';
        var btnId   = tipo === 'promocion' ? 'btn-add-promocion'    : 'btn-add-vendido';

        this.view.$el.find('#' + badgeId).text(items.length + ' / ' + MAX_REFS);
        var $addBtn = this.view.$el.find('#' + btnId);
        items.length >= MAX_REFS ? $addBtn.hide() : $addBtn.show();

        if (items.length === 0) {
            this.view.$el.find('#' + listId).html(
                '<div style="text-align:center; padding:20px; color:var(--ave-text-muted);">No hay referencias agregadas.</div>'
            );
            return;
        }

        var html = '';
        items.forEach(function (ref, idx) {
            var m2Display   = ref.valorm2 ? '$ ' + parseFloat(ref.valorm2).toFixed(2) + '/m²' : '-';
            var calcBadge   = ref.usarCalculo
                ? '<span class="ave-ref-calc-badge ave-ref-calc-si">En cálculo</span>'
                : '<span class="ave-ref-calc-badge ave-ref-calc-no">Excluida</span>';
            var fotoUrl     = ref.fotoId ? 'api/v1/Attachment/file/' + ref.fotoId : null;
            var areaCon     = ref.areaConstruida ? parseFloat(ref.areaConstruida).toLocaleString('es-VE') + ' m²' : '-';
            var areaTer     = ref.areaTerreno    ? parseFloat(ref.areaTerreno).toLocaleString('es-VE') + ' m²'    : '-';

            html += '<div class="ave-ref-card">';

            // ── Header ──────────────────────────────────────────────────
            html += '<div class="ave-ref-card-header">';

            // Número + thumbnail foto
            html += '<div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">';
            html += '<span class="ave-ref-card-num">' + (idx + 1) + '</span>';
            if (fotoUrl) {
                html += '<img src="' + fotoUrl + '" class="ave-ref-thumb" alt="foto referencia">';
            } else {
                html += '<div class="ave-ref-thumb ave-ref-thumb-empty"><i class="fas fa-image"></i></div>';
            }
            html += '</div>';

            // Info central
            html += '<div class="ave-ref-card-info">';
            html += '<div class="ave-ref-card-title">';
            html += self.escape(ref.tipoPropiedad || 'Sin tipo') + ' — ' + self.escape(ref.subtipoPropiedad || 'Sin subtipo');
            html += ' ' + calcBadge;
            html += '</div>';

            // Chips de área + valor m²
            html += '<div class="ave-ref-areas-row">';
            html += '<span class="ave-ref-area-chip"><i class="fas fa-ruler-combined"></i> Const. <strong>' + areaCon + '</strong></span>';
            html += '<span class="ave-ref-area-chip"><i class="fas fa-expand-arrows-alt"></i> Terreno <strong>' + areaTer + '</strong></span>';
            if (ref.valorReferencial) {
                html += '<span class="ave-ref-area-chip ave-ref-area-chip--precio"><i class="fas fa-dollar-sign"></i> <strong>$ ' + parseFloat(ref.valorReferencial).toLocaleString('es-VE') + '</strong></span>';
            }
            html += '<span class="ave-valorm2-display" style="margin-left:4px;">' + m2Display + '</span>';
            html += '</div>';
            html += '</div>'; // /.ave-ref-card-info

            // Acciones
            html += '<div class="ave-ref-card-actions">';
            html += '<button class="ave-btn ave-btn-secondary ave-btn-sm" data-action="editar-ref" data-tipo="' + tipo + '" data-idx="' + idx + '"><i class="fas fa-edit"></i> Editar</button>';
            html += '<button class="ave-btn ave-btn-danger ave-btn-sm" data-action="eliminar-ref" data-tipo="' + tipo + '" data-idx="' + idx + '"><i class="fas fa-trash"></i></button>';
            html += '</div>';

            html += '</div>'; // /.ave-ref-card-header

            // ── Body (resto de campos) ───────────────────────────────────
            html += '<div class="ave-ref-card-body">';
            html += '<div class="row">';

            // Foto a tamaño completo en el body (si existe), más los demás campos
            if (fotoUrl) {
                html += '<div class="col-md-2">';
                html += '<div class="ave-ref-field">';
                html += '<div class="ave-ref-field-label">Foto</div>';
                html += '<img src="' + fotoUrl + '" class="ave-ref-foto-full" alt="foto referencia">';
                html += '</div></div>';
            }

            var colClass = fotoUrl ? 'col-md-2' : 'col-md-3';

            // Campos secundarios — excluimos área construida, terreno y valor (ya en header)
            html += self.fieldHtml('Antigüedad',    ref.antiguedad    ? ref.antiguedad + ' años' : '-', colClass);
            html += self.fieldHtml('Habitaciones',  ref.habitaciones  || '-', colClass);
            html += self.fieldHtml('Baños',         ref.banos         || '-', colClass);
            html += self.fieldHtml('Estacionam.',   ref.estacionamiento || '-', colClass);
            html += self.fieldHtml('Piso',          ref.piso          || '-', colClass);
            html += self.fieldHtml('Acabados',      ref.acabados      || '-', colClass);
            html += self.fieldHtml('Seguridad',     ref.seguridad     || '-', colClass);
            html += self.fieldHtml('Terraza',       ref.terraza       ? 'Sí' : 'No', colClass);
            html += self.fieldHtml('Ascensores',    ref.ascensores    ? 'Sí' : 'No', colClass);

            if (ref.descripcion) {
                html += '<div class="col-md-12"><div class="ave-ref-field"><div class="ave-ref-field-label">Descripción</div><div class="ave-ref-field-value">' + self.escape(ref.descripcion) + '</div></div></div>';
            }
            if (ref.enlace) {
                html += '<div class="col-md-12"><div class="ave-ref-field"><div class="ave-ref-field-label">Enlace</div><div class="ave-ref-field-value"><a href="' + self.escape(ref.enlace) + '" target="_blank" rel="noopener">' + self.escape(ref.enlace) + '</a></div></div></div>';
            }

            html += '</div></div>'; // /.row  /.ave-ref-card-body
            html += '</div>';       // /.ave-ref-card
        });

        this.view.$el.find('#' + listId).html(html);
    };

    ReferenciasManager.prototype.fieldHtml = function (label, value, colClass) {
        colClass = colClass || 'col-md-3';
        return '<div class="' + colClass + '"><div class="ave-ref-field">' +
            '<div class="ave-ref-field-label">' + label + '</div>' +
            '<div class="ave-ref-field-value">' + this.escape(String(value)) + '</div>' +
            '</div></div>';
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