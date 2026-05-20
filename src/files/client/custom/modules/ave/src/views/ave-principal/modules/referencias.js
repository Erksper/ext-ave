define('ave:views/ave-principal/modules/referencias', [], function () {

    var MAX_REFS = 5;

    var ReferenciasManager = function (view) {
        this.view = view;
        // Listas separadas por tipo
        this.items = { promocion: [], vendido: [] };
    };

    // ─────────────────────────────────────────────
    // Carga inicial desde datos del servidor
    // ─────────────────────────────────────────────
    ReferenciasManager.prototype.cargar = function (referencias) {
        var self = this;
        this.items = { promocion: [], vendido: [] };

        referencias.forEach(function (ref) {
            var tipo = ref.tipo === 'vendido' ? 'vendido' : 'promocion';
            self.items[tipo].push(ref);
        });

        this.renderizar('promocion');
        this.renderizar('vendido');
    };

    // ─────────────────────────────────────────────
    // Abrir modal (nuevo o edición)
    // ─────────────────────────────────────────────
    ReferenciasManager.prototype.abrirModal = function (tipo, idx) {
        var self  = this;
        var items = this.items[tipo];

        // Verificar límite solo para nuevo
        if (idx === null && items.length >= MAX_REFS) {
            Espo.Ui.warning('Máximo ' + MAX_REFS + ' inmuebles de referencia permitidos');
            return;
        }

        var esTitulo = tipo === 'promocion' ? 'En Promoción' : 'Vendido';
        this.view.$el.find('#modal-ref-titulo').html(
            '<i class="fas fa-tag"></i> Referencia ' + esTitulo +
            (idx !== null ? ' — Editar #' + (idx + 1) : ' — Nuevo')
        );
        this.view.$el.find('#ref-modal-tipo').val(tipo);
        this.view.$el.find('#ref-modal-idx').val(idx !== null ? idx : '');

        // Limpiar o pre-llenar
        if (idx !== null && items[idx]) {
            this.llenarModal(items[idx]);
        } else {
            this.limpiarModal();
        }

        // Configurar listener guardar
        this.view.$el.find('#btn-guardar-referencia').off('click').on('click', function () {
            self.guardarDesdeModal();
        });

        // Listener cálculo m2
        this.view.$el.find('#ref-valorReferencial, #ref-areaConstruida').off('input.ref').on('input.ref', function () {
            self.calcularM2();
        });

        this.view.$el.find('#modalReferencia').modal('show');
    };

    ReferenciasManager.prototype.limpiarModal = function () {
        var campos = ['ref-valorReferencial','ref-areaTerreno','ref-areaConstruida',
            'ref-antiguedad','ref-habitaciones','ref-banos','ref-estacionamiento',
            'ref-piso','ref-valorm2','ref-descripcion','ref-enlace'];
        campos.forEach(function (id) { this.view.$el.find('#' + id).val(''); }.bind(this));
        this.view.$el.find('#ref-tipoPropiedad').val('');
        this.view.$el.find('#ref-subtipoPropiedad').val('');
        this.view.$el.find('#ref-usarCalculo').val('1');
        this.view.$el.find('#ref-acabados').val('');
        this.view.$el.find('#ref-seguridad').val('');
        this.view.$el.find('#ref-ascensores').prop('checked', false);
        this.view.$el.find('#ref-terraza').prop('checked', false);
    };

    ReferenciasManager.prototype.llenarModal = function (ref) {
        var set = function (id, val) {
            this.view.$el.find('#' + id).val(val || '');
        }.bind(this);

        set('ref-tipoPropiedad',    ref.tipoPropiedad);
        set('ref-subtipoPropiedad', ref.subtipoPropiedad);
        this.view.$el.find('#ref-usarCalculo').val(ref.usarCalculo ? '1' : '0');
        set('ref-valorReferencial', ref.valorReferencial);
        set('ref-areaTerreno',      ref.areaTerreno);
        set('ref-areaConstruida',   ref.areaConstruida);
        set('ref-antiguedad',       ref.antiguedad);
        set('ref-habitaciones',     ref.habitaciones);
        set('ref-banos',            ref.banos);
        set('ref-estacionamiento',  ref.estacionamiento);
        set('ref-piso',             ref.piso);
        set('ref-acabados',         ref.acabados);
        set('ref-seguridad',        ref.seguridad);
        set('ref-valorm2',          ref.valorm2);
        set('ref-descripcion',      ref.descripcion);
        set('ref-enlace',           ref.enlace);
        this.view.$el.find('#ref-ascensores').prop('checked', !!ref.ascensores);
        this.view.$el.find('#ref-terraza').prop('checked',    !!ref.terraza);
    };

    ReferenciasManager.prototype.calcularM2 = function () {
        var precio = parseFloat(this.view.$el.find('#ref-valorReferencial').val()) || 0;
        var area   = parseFloat(this.view.$el.find('#ref-areaConstruida').val())   || 0;
        var m2     = (precio > 0 && area > 0) ? (precio / area).toFixed(2) : '';
        this.view.$el.find('#ref-valorm2').val(m2);
    };

    // ─────────────────────────────────────────────
    // Guardar desde modal
    // ─────────────────────────────────────────────
    ReferenciasManager.prototype.guardarDesdeModal = function () {
        var tipo = this.view.$el.find('#ref-modal-tipo').val();
        var idx  = this.view.$el.find('#ref-modal-idx').val();
        idx = (idx !== '') ? parseInt(idx) : null;

        var ref = {
            tipo:             tipo,
            tipoPropiedad:    this.view.$el.find('#ref-tipoPropiedad').val(),
            subtipoPropiedad: this.view.$el.find('#ref-subtipoPropiedad').val(),
            usarCalculo:      this.view.$el.find('#ref-usarCalculo').val() === '1',
            valorReferencial: parseFloat(this.view.$el.find('#ref-valorReferencial').val()) || null,
            areaTerreno:      parseFloat(this.view.$el.find('#ref-areaTerreno').val())      || null,
            areaConstruida:   parseFloat(this.view.$el.find('#ref-areaConstruida').val())   || null,
            antiguedad:       parseInt(this.view.$el.find('#ref-antiguedad').val())         || null,
            habitaciones:     parseInt(this.view.$el.find('#ref-habitaciones').val())       || null,
            banos:            parseInt(this.view.$el.find('#ref-banos').val())              || null,
            estacionamiento:  parseInt(this.view.$el.find('#ref-estacionamiento').val())    || null,
            piso:             this.view.$el.find('#ref-piso').val(),
            acabados:         this.view.$el.find('#ref-acabados').val(),
            seguridad:        this.view.$el.find('#ref-seguridad').val(),
            valorm2:          parseFloat(this.view.$el.find('#ref-valorm2').val())          || null,
            descripcion:      this.view.$el.find('#ref-descripcion').val(),
            enlace:           this.view.$el.find('#ref-enlace').val(),
            ascensores:       this.view.$el.find('#ref-ascensores').is(':checked'),
            terraza:          this.view.$el.find('#ref-terraza').is(':checked')
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

    // ─────────────────────────────────────────────
    // Eliminar
    // ─────────────────────────────────────────────
    ReferenciasManager.prototype.eliminar = function (tipo, idx) {
        if (!confirm('¿Eliminar esta referencia?')) return;
        this.items[tipo].splice(idx, 1);
        this.renderizar(tipo);
        Espo.Ui.success('Referencia eliminada');
    };

    // ─────────────────────────────────────────────
    // Renderizar lista
    // ─────────────────────────────────────────────
    ReferenciasManager.prototype.renderizar = function (tipo) {
        var self   = this;
        var items  = this.items[tipo];
        var listId = tipo === 'promocion' ? 'refs-promocion-lista' : 'refs-vendido-lista';
        var badgeId= tipo === 'promocion' ? 'badge-promocion'      : 'badge-vendido';
        var btnId  = tipo === 'promocion' ? 'btn-add-promocion'    : 'btn-add-vendido';

        this.view.$el.find('#' + badgeId).text(items.length + ' / ' + MAX_REFS);

        // Ocultar botón agregar si ya hay 5
        var $addBtn = this.view.$el.find('#' + btnId);
        if (items.length >= MAX_REFS) {
            $addBtn.hide();
        } else {
            $addBtn.show();
        }

        if (items.length === 0) {
            this.view.$el.find('#' + listId).html(
                '<div style="text-align:center; color:var(--ave-text-muted); padding:20px; font-size:13px;">' +
                '<i class="fas fa-info-circle"></i> No hay referencias agregadas aún.</div>'
            );
            return;
        }

        var html = '';
        items.forEach(function (ref, idx) {
            var m2Display = ref.valorm2 ? '$ ' + parseFloat(ref.valorm2).toFixed(2) + '/m²' : '-';
            var calcBadge = ref.usarCalculo
                ? '<span class="ave-ref-calc-badge ave-ref-calc-si">Usar en cálculo</span>'
                : '<span class="ave-ref-calc-badge ave-ref-calc-no">Excluir</span>';

            html += '<div class="ave-ref-card">';
            html += '<div class="ave-ref-card-header">';
            html += '<span class="ave-ref-card-num">' + (idx + 1) + '</span>';
            html += '<div class="ave-ref-card-info">';
            html += '<div class="ave-ref-card-title">';
            html += self.escape(ref.tipoPropiedad || 'Sin tipo') + ' — ' + self.escape(ref.subtipoPropiedad || 'Sin subtipo');
            html += ' ' + calcBadge;
            html += '</div>';
            html += '<div class="ave-ref-card-subtitle">';
            if (ref.valorReferencial) html += 'Valor: $' + parseFloat(ref.valorReferencial).toLocaleString('es-VE') + ' &nbsp;|&nbsp; ';
            html += '<span class="ave-valorm2-display">' + m2Display + '</span>';
            html += '</div>';
            html += '</div>';
            html += '<div class="ave-ref-card-actions">';
            html += '<button class="ave-btn ave-btn-secondary ave-btn-sm" data-action="editar-ref" data-tipo="' + tipo + '" data-idx="' + idx + '">';
            html += '<i class="fas fa-edit"></i> Editar</button>';
            html += '<button class="ave-btn ave-btn-danger ave-btn-sm" data-action="eliminar-ref" data-tipo="' + tipo + '" data-idx="' + idx + '">';
            html += '<i class="fas fa-trash"></i></button>';
            html += '</div>';
            html += '</div>'; // /header

            // Detalles expandidos
            html += '<div class="ave-ref-card-body">';
            html += '<div class="row">';
            html += self.fieldHtml('Área Construida', ref.areaConstruida ? ref.areaConstruida + ' m²' : '-');
            html += self.fieldHtml('Área Terreno',    ref.areaTerreno    ? ref.areaTerreno    + ' m²' : '-');
            html += self.fieldHtml('Antigüedad',      ref.antiguedad     ? ref.antiguedad + ' años'   : '-');
            html += self.fieldHtml('Habitaciones',    ref.habitaciones   || '-');
            html += self.fieldHtml('Baños',           ref.banos          || '-');
            html += self.fieldHtml('Estacionamiento', ref.estacionamiento|| '-');
            html += self.fieldHtml('Piso',            ref.piso           || '-');
            html += self.fieldHtml('Acabados',        ref.acabados       || '-');
            html += self.fieldHtml('Seguridad',       ref.seguridad      || '-');
            html += self.fieldHtml('Terraza',         ref.terraza   ? 'Sí' : 'No');
            html += self.fieldHtml('Ascensores',      ref.ascensores? 'Sí' : 'No');
            if (ref.enlace) {
                html += '<div class="col-md-6"><div class="ave-ref-field">';
                html += '<div class="ave-ref-field-label">Enlace</div>';
                html += '<div class="ave-ref-field-value"><a href="' + self.escape(ref.enlace) + '" target="_blank" rel="noopener">' + self.escape(ref.enlace) + '</a></div>';
                html += '</div></div>';
            }
            if (ref.descripcion) {
                html += '<div class="col-md-12"><div class="ave-ref-field">';
                html += '<div class="ave-ref-field-label">Descripción</div>';
                html += '<div class="ave-ref-field-value">' + self.escape(ref.descripcion) + '</div>';
                html += '</div></div>';
            }
            html += '</div>'; // /row
            html += '</div>'; // /body
            html += '</div>'; // /ref-card
        });

        this.view.$el.find('#' + listId).html(html);
    };

    ReferenciasManager.prototype.fieldHtml = function (label, value) {
        return '<div class="col-md-3"><div class="ave-ref-field">' +
            '<div class="ave-ref-field-label">' + label + '</div>' +
            '<div class="ave-ref-field-value">' + this.escape(String(value)) + '</div>' +
            '</div></div>';
    };

    // ─────────────────────────────────────────────
    // getData para guardar
    // ─────────────────────────────────────────────
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
