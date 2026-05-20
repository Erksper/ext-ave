define('ave:views/ave-principal/modules/decisiones', [], function () {

    var DecisionesManager = function (view) {
        this.view      = view;
        this.decisiones= [];
        this.canales   = [];
        this.planes    = [];
        this.catalogoCanales = [];
    };

    // ─────────────────────────────────────────────
    // Cargar catálogos
    // ─────────────────────────────────────────────
    DecisionesManager.prototype.cargarCatalogos = function (teamId) {
        var self = this;

        // Canales (medios publicitarios)
        Espo.Ajax.getRequest('AvePrincipal/action/getFactoresPorTipo', { tipo: 'canal', teamId: teamId })
            .then(function (response) {
                if (!response.success) return;
                self.catalogoCanales = response.data || [];
                self.poblarSelectCanales();
            });
    };

    DecisionesManager.prototype.poblarSelectCanales = function () {
        var self    = this;
        var $select = this.view.$el.find('#select-canal');
        $select.empty().append('<option value="">-- Seleccione un medio --</option>');

        var idsAgregados = this.canales.map(function (c) { return c.id; });
        this.catalogoCanales.forEach(function (c) {
            if (idsAgregados.indexOf(c.id) === -1) {
                $select.append('<option value="' + c.id + '">' + self.escape(c.name) + '</option>');
            }
        });
    };

    // ─────────────────────────────────────────────
    // Cargar items existentes
    // ─────────────────────────────────────────────
    DecisionesManager.prototype.cargarItems = function (decisiones, canales, planes) {
        this.decisiones = decisiones || [];
        this.canales    = canales    || [];
        this.planes     = planes     || [];
        this.renderizar('decicion');
        this.renderizar('canal');
        this.renderizar('plan');
    };

    // ─────────────────────────────────────────────
    // Modales Decisión / Plan
    // ─────────────────────────────────────────────
    DecisionesManager.prototype.abrirModal = function (tipo) {
        var self = this;

        var titulo = tipo === 'decicion' ? 'Nueva Decisión' : 'Nuevo Plan de Trabajo';
        this.view.$el.find('#modal-decision-titulo').html(
            '<i class="fas fa-' + (tipo === 'decicion' ? 'check-square' : 'tasks') + '"></i> ' + titulo
        );
        this.view.$el.find('#decision-tipo-actual').val(tipo);
        this.view.$el.find('#decision-nombre').val('');
        this.view.$el.find('#decision-descripcion').val('');

        this.view.$el.find('#btn-guardar-decision').off('click').on('click', function () {
            self.guardarDesdeModal();
        });

        this.view.$el.find('#modalDecision').modal('show');
        setTimeout(function () { self.view.$el.find('#decision-nombre').focus(); }, 400);
    };

    DecisionesManager.prototype.guardarDesdeModal = function () {
        var tipo   = this.view.$el.find('#decision-tipo-actual').val();
        var nombre = this.view.$el.find('#decision-nombre').val().trim();
        var desc   = this.view.$el.find('#decision-descripcion').val().trim();

        if (!nombre) {
            Espo.Ui.warning('El título es requerido');
            this.view.$el.find('#decision-nombre').focus();
            return;
        }

        var item = { id: null, name: nombre, descripcion: desc };

        if (tipo === 'decicion') {
            this.decisiones.push(item);
        } else {
            this.planes.push(item);
        }

        this.renderizar(tipo);
        this.view.$el.find('#modalDecision').modal('hide');
        Espo.Ui.success('Agregado correctamente');
    };

    // ─────────────────────────────────────────────
    // Modal Canal
    // ─────────────────────────────────────────────
    DecisionesManager.prototype.abrirModalCanal = function () {
        var self = this;
        this.view.$el.find('#canal-nombre').val('');

        this.view.$el.find('#btn-guardar-canal').off('click').on('click', function () {
            self.crearCanal();
        });

        this.view.$el.find('#modalCanal').modal('show');
        setTimeout(function () { self.view.$el.find('#canal-nombre').focus(); }, 400);
    };

    DecisionesManager.prototype.crearCanal = function () {
        var self   = this;
        var nombre = this.view.$el.find('#canal-nombre').val().trim();

        if (!nombre) {
            Espo.Ui.warning('El nombre del medio es requerido');
            this.view.$el.find('#canal-nombre').focus();
            return;
        }

        var $btn = this.view.$el.find('#btn-guardar-canal');
        var orig = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

        Espo.Ajax.postRequest('AvePrincipal/action/crearFactor', {
            nombre:  nombre,
            tipo:    'canal',
            teamId:  this.view.teamId
        })
        .then(function (response) {
            if (response.success) {
                var nuevo = response.data;
                self.catalogoCanales.push(nuevo);
                self.canales.push({ id: nuevo.id, name: nuevo.name });
                self.renderizar('canal');
                self.poblarSelectCanales();
                self.view.$el.find('#modalCanal').modal('hide');
                Espo.Ui.success('Medio creado y agregado');
            } else {
                Espo.Ui.error(response.error || 'Error al crear');
            }
        })
        .catch(function () { Espo.Ui.error('Error al crear el medio'); })
        .finally(function () { $btn.prop('disabled', false).html(orig); });
    };

    DecisionesManager.prototype.agregarCanalDesdeSelect = function () {
        var $select = this.view.$el.find('#select-canal');
        var id      = $select.val();
        if (!id) {
            Espo.Ui.warning('Seleccione un medio primero');
            return;
        }

        var canal = this.catalogoCanales.find(function (c) { return c.id === id; });
        if (!canal) return;

        this.canales.push({ id: canal.id, name: canal.name });
        $select.val('');
        this.renderizar('canal');
        this.poblarSelectCanales();
        Espo.Ui.success('Medio agregado');
    };

    // ─────────────────────────────────────────────
    // Quitar
    // ─────────────────────────────────────────────
    DecisionesManager.prototype.quitar = function (tipo, idx) {
        if (tipo === 'decicion') this.decisiones.splice(idx, 1);
        if (tipo === 'canal')    this.canales.splice(idx, 1);
        if (tipo === 'plan')     this.planes.splice(idx, 1);
        this.renderizar(tipo);
        if (tipo === 'canal') this.poblarSelectCanales();
    };

    // ─────────────────────────────────────────────
    // Renderizar tabla
    // ─────────────────────────────────────────────
    DecisionesManager.prototype.renderizar = function (tipo) {
        var self    = this;
        var items   = tipo === 'decicion' ? this.decisiones : (tipo === 'canal' ? this.canales : this.planes);
        var tbodyId = tipo === 'decicion' ? 'decisiones-tbody' : (tipo === 'canal' ? 'canales-tbody' : 'planes-tbody');
        var emptyId = tipo === 'decicion' ? 'decisiones-empty-row' : (tipo === 'canal' ? 'canales-empty-row' : 'planes-empty-row');
        var action  = tipo === 'decicion' ? 'quitar-decision' : (tipo === 'canal' ? 'quitar-canal' : 'quitar-plan');

        var $tbody = this.view.$el.find('#' + tbodyId);
        var $empty = this.view.$el.find('#' + emptyId);

        $tbody.find('tr:not(#' + emptyId + ')').remove();

        if (items.length === 0) {
            $empty.show();
            return;
        }

        $empty.hide();
        var rows = '';

        items.forEach(function (item, idx) {
            if (tipo === 'canal') {
                rows += '<tr>';
                rows += '<td>' + self.escape(item.name) + '</td>';
                rows += '<td style="text-align:center;"><button class="ave-btn-quitar" data-action="' + action + '" data-idx="' + idx + '"><i class="fas fa-times"></i></button></td>';
                rows += '</tr>';
            } else {
                rows += '<tr>';
                rows += '<td style="font-weight:600;">' + self.escape(item.name) + '</td>';
                rows += '<td style="color:var(--ave-text-muted);">' + self.escape(item.descripcion || '') + '</td>';
                rows += '<td style="text-align:center;"><button class="ave-btn-quitar" data-action="' + action + '" data-idx="' + idx + '"><i class="fas fa-times"></i></button></td>';
                rows += '</tr>';
            }
        });

        $tbody.append(rows);
    };

    // ─────────────────────────────────────────────
    // getData
    // ─────────────────────────────────────────────
    DecisionesManager.prototype.getData = function (tipo) {
        if (tipo === 'decicion') return this.decisiones;
        if (tipo === 'canal')    return this.canales;
        if (tipo === 'plan')     return this.planes;
        return [];
    };

    DecisionesManager.prototype.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return DecisionesManager;
});
