define('ave:views/ave-principal/modules/itemsManager', [], function () {

    var ItemsManager = function (view, tipo, options) {
        this.view = view;
        this.tipo = tipo;
        this.items = [];
        this.catalogo = [];
        this.labelSingular = options.labelSingular || 'ítem';
        this.tieneImpacto = options.tieneImpacto || false;
        this.tieneDescripcion = options.tieneDescripcion !== false; 
    };

    // Cargar catálogo desde servidor
    ItemsManager.prototype.cargarCatalogo = function (teamId) {
        var self = this;
        Espo.Ajax.getRequest('AvePrincipal/action/getFactoresPorTipo', { tipo: this.tipo, teamId: teamId })
            .then(function (response) {
                if (response.success && response.data) {
                    self.catalogo = response.data;
                    self.poblarSelect();
                }
            });
    };

    // Llenar select con items no agregados
    ItemsManager.prototype.poblarSelect = function () {
        var self = this;
        var $select = this.view.$el.find('#select-' + this.tipo);
        if (!$select.length) return;
        $select.empty().append('<option value="">-- Seleccione ' + this.labelSingular + ' --</option>');
        var idsAgregados = this.items.map(function (i) { return i.id; });
        this.catalogo.forEach(function (item) {
            if (idsAgregados.indexOf(item.id) === -1) {
                var text = item.name;
                if (this.tieneImpacto && item.impacto) {
                    text += ' (' + (item.impacto === 'positivo' ? 'Positivo' : 'Negativo') + ')';
                }
                $select.append('<option value="' + item.id + '">' + self.escape(text) + '</option>');
            }
        }.bind(this));
    };

    // Cargar items ya vinculados al AVE
    ItemsManager.prototype.cargarItems = function (items) {
        this.items = items || [];
        this.renderizar();
    };

    // Agregar desde select
    ItemsManager.prototype.agregarDesdeSelect = function () {
        var $select = this.view.$el.find('#select-' + this.tipo);
        var id = $select.val();
        if (!id) {
            Espo.Ui.warning('Seleccione un ' + this.labelSingular + ' primero');
            return;
        }
        var item = this.catalogo.find(function (i) { return i.id == id; });
        if (!item) return;
        var newItem = { id: item.id, name: item.name };
        if (this.tieneDescripcion) newItem.descripcion = item.descripcion || '';
        if (this.tieneImpacto) newItem.impacto = item.impacto;
        this.items.push(newItem);
        $select.val('');
        this.renderizar();
        this.poblarSelect();
        Espo.Ui.success(this.labelSingular + ' agregado');
    };

    // Abrir modal para nuevo item
    ItemsManager.prototype.abrirModalNuevo = function () {
        var self = this;
        this.view.$el.find('#item-nombre').val('');
        this.view.$el.find('#item-descripcion').val('');
        
        // Controlar visibilidad de campos según el tipo
        if (this.tieneDescripcion) {
            this.view.$el.find('#item-descripcion-group').show();
        } else {
            this.view.$el.find('#item-descripcion-group').hide();
        }
        
        if (this.tieneImpacto) {
            this.view.$el.find('#item-impacto-group').show();
            this.view.$el.find('input[name="item-impacto"][value="positivo"]').prop('checked', true);
        } else {
            this.view.$el.find('#item-impacto-group').hide();
        }
        
        this.view.$el.find('#item-predeterminado').prop('checked', false);
        
        this.view.$el.find('#btn-guardar-item').off('click').on('click', function () {
            self.crearNuevo();
        });
        
        this.view.$el.find('#modalItem').modal('show');
        setTimeout(function () { self.view.$el.find('#item-nombre').focus(); }, 400);
    };

    // Crear nuevo item en backend
    ItemsManager.prototype.crearNuevo = function () {
        var self = this;
        var nombre = this.view.$el.find('#item-nombre').val().trim();
        if (!nombre) {
            Espo.Ui.warning('El nombre es requerido');
            this.view.$el.find('#item-nombre').focus();
            return;
        }
        var data = {
            nombre: nombre,
            tipo: this.tipo,
            descripcion: this.tieneDescripcion ? this.view.$el.find('#item-descripcion').val() : '',
            predeterminado: this.view.$el.find('#item-predeterminado').is(':checked'),
            teamId: this.view.teamId
        };
        if (this.tieneImpacto) {
            data.impacto = this.view.$el.find('input[name="item-impacto"]:checked').val();
        }
        var $btn = this.view.$el.find('#btn-guardar-item');
        var orig = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
        Espo.Ajax.postRequest('AvePrincipal/action/crearFactor', data)
            .then(function (response) {
                if (response.success) {
                    var nuevo = response.data;
                    self.catalogo.push(nuevo);
                    var newItem = { id: nuevo.id, name: nuevo.name };
                    if (self.tieneDescripcion) newItem.descripcion = nuevo.descripcion || '';
                    if (self.tieneImpacto) newItem.impacto = nuevo.impacto;
                    self.items.push(newItem);
                    self.renderizar();
                    self.poblarSelect();
                    self.view.$el.find('#modalItem').modal('hide');
                    Espo.Ui.success(self.labelSingular + ' creado y agregado');
                } else {
                    Espo.Ui.error(response.error || 'Error al crear');
                }
            })
            .catch(function () { Espo.Ui.error('Error al crear'); })
            .finally(function () { $btn.prop('disabled', false).html(orig); });
    };

    // Quitar item
    ItemsManager.prototype.quitar = function (idx) {
        console.log('Quitando item en posición:', idx, 'Tipo:', this.tipo);
        this.items.splice(idx, 1);
        this.renderizar();
        this.poblarSelect();  // Actualiza el select para mostrar los items disponibles
        Espo.Ui.success(this.labelSingular + ' eliminado');
    };

    // Renderizar tabla
    ItemsManager.prototype.renderizar = function () {
        var self = this;
        var tbodyId = this.tipo + 'es-tbody';
        var $tbody = this.view.$el.find('#' + tbodyId);
        var $empty = this.view.$el.find('#' + this.tipo + '-empty-row');
        
        if (this.items.length === 0) {
            if ($empty.length) $empty.show();
            return;
        }
        if ($empty.length) $empty.hide();
        
        var rows = '';
        for (var idx = 0; idx < this.items.length; idx++) {
            var item = this.items[idx];
            rows += '<tr>';
            
            // Columna 1: Nombre/Título
            rows += '<td style="font-weight:600;">' + this.escape(item.name) + '</td>';
            
            // Columna 2: Descripción (si aplica)
            if (this.tieneDescripcion) {
                rows += '<td style="color:var(--ave-text-muted);">' + this.escape(item.descripcion || '') + '</td>';
            }
            
            // Columna 3: Impacto (SOLO para factores)
            if (this.tieneImpacto) {
                var impactoHtml = item.impacto === 'positivo'
                    ? '<span class="ave-impacto-positivo">&#9650; Positivo</span>'
                    : '<span class="ave-impacto-negativo">&#9660; Negativo</span>';
                rows += '<td style="text-align:center;">' + impactoHtml + '</td>';
            }
            
            // Última columna: Botón quitar
            rows += '<td style="text-align:center;">';
            rows += '<button class="ave-btn-quitar" data-action="quitar-' + this.tipo + '" data-idx="' + idx + '" title="Quitar">';
            rows += '<i class="fas fa-times"></i></button>';
            rows += '</td>';
            
            rows += '</tr>';
        }
        
        $tbody.find('tr:not(#' + this.tipo + '-empty-row)').remove();
        $tbody.append(rows);
        
        // Vincular eventos de los botones después de renderizar
        $tbody.find('.ave-btn-quitar').off('click').on('click', function(e) {
            e.stopPropagation();
            var $btn = $(this);
            var idx = $btn.data('idx');
            if (idx !== undefined) {
                self.quitar(idx);
            }
        });
    };

    // Obtener datos para guardar
    ItemsManager.prototype.getData = function () {
        return this.items.map(function (i) {
            var item = { id: i.id, name: i.name };
            if (this.tieneDescripcion) {
                item.descripcion = i.descripcion || '';
            }
            if (this.tieneImpacto) {
                item.impacto = i.impacto;
            }
            return item;
        }.bind(this));
    };

    ItemsManager.prototype.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return ItemsManager;
});