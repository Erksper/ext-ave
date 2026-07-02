// client/custom/modules/ave/src/views/ave-principal/list.js

define('ave:views/ave-principal/list', ['view'], function (Dep) {

    return Dep.extend({

        template: 'ave:ave-principal/list',

        pagina: 1,
        porPagina: 20,
        totalRegistros: 0,
        totalPaginas: 0,
        datos: [],

        statusMap: {
            'elaboracion': { 
                texto: 'En Elaboración', 
                clase: 'ave-status-elaboracion', 
                nextStatus: 'impresion', 
                nextButtonText: 'Aprobar', 
                buttonClass: 'success' 
            },
            'impresion': { 
                texto: 'Listo para Imprimir', 
                clase: 'ave-status-impresion', 
                nextStatus: null, 
                nextButtonText: 'Imprimir', 
                buttonClass: 'primary',
                invalidarText: 'Invalidar',
                invalidarStatus: 'elaboracion'
            }
        },

        events: {
            'click [data-action="crear-nuevo"]': function () {
                this.crearNuevo();
            },
            'click [data-action="filtrar"]': function () {
                this.pagina = 1;
                this.aplicarFiltrosYRecargar();
            },
            'click [data-action="limpiar-filtros"]': function () {
                this.limpiarFiltros();
            },
            'click [data-action="ver-ave"]': function (e) {
                this.verAve($(e.currentTarget).data('id'));
            },
            'click [data-action="cambiar-status"]': function (e) {
                var id = $(e.currentTarget).data('id');
                var statusActual = $(e.currentTarget).data('status');
                var accion = $(e.currentTarget).data('accion');
                this.cambiarStatus(id, statusActual, accion);
            },
            'click .ave-pag-btn': function (e) {
                var pagina = $(e.currentTarget).data('pagina');
                if (pagina && pagina !== this.pagina) {
                    this.pagina = parseInt(pagina);
                    this.cargarLista();
                }
            },
            'change #filtro-cla': function (e) {
                this.onCLAChange($(e.currentTarget).val());
            },
            'change #filtro-oficina': function (e) {
                this.onOficinaChange($(e.currentTarget).val());
            }
        },

        setup: function () {
            Dep.prototype.setup.call(this);
            var user = this.getUser();
            this.currentUserId = user.get('id');
            this.currentUserName = user.get('name');
            this.permisos = null;
            this.filtros = {
                cla: null,
                oficina: null,
                asesor: null,
                status: null
            };
            this.cargarPermisos();
        },

        // Función para verificar si el usuario puede aprobar/invalidar
        puedeAprobarOInvalidar: function () {
            if (!this.permisos) return false;
            return this.permisos.esCasaNacional || 
                   this.permisos.esGerente || 
                   this.permisos.esDirector || 
                   this.permisos.esCoordinador;
        },

        // Función para verificar si el usuario puede imprimir
        puedeImprimir: function () {
            if (!this.permisos) return true;
            return true;
        },

        cargarPermisos: function () {
            var self = this;
            Espo.Ajax.getRequest('AvePrincipal/action/getUserInfo', { userId: this.currentUserId })
                .then(function (response) {
                    if (response.success) {
                        self.permisos = response.data;
                        self.aplicarVisibilidadFiltros();
                        self.cargarSelectsIniciales();
                        self.aplicarFiltrosPorRol();
                        self.cargarLista();
                    } else {
                        self.cargarLista();
                    }
                })
                .catch(function () {
                    self.cargarLista();
                });
        },

        aplicarFiltrosPorRol: function () {
            if (!this.permisos) return;
            
            this.filtros = {
                cla: null,
                oficina: null,
                asesor: null,
                status: null
            };
            
            if (this.permisos.esAsesor) {
                this.filtros.asesor = this.currentUserId;
            } else if (this.permisos.tieneRolesGestion && !this.permisos.esCasaNacional) {
                if (this.permisos.oficinaUsuario) {
                    this.filtros.oficina = this.permisos.oficinaUsuario;
                }
            }
            
            this.actualizarSelectsSegunFiltros();
        },

        actualizarSelectsSegunFiltros: function () {
            if (this.permisos && this.permisos.esAsesor) {
                this.$el.find('#filtro-cla').prop('disabled', true);
                this.$el.find('#filtro-oficina').prop('disabled', true);
                this.$el.find('#filtro-asesor').prop('disabled', true);
                this.$el.find('#filtro-asesor').val(this.currentUserId);
            }
            
            if (this.permisos && this.permisos.tieneRolesGestion && !this.permisos.esCasaNacional) {
                this.$el.find('#filtro-cla').prop('disabled', true);
                this.$el.find('#filtro-oficina').prop('disabled', true);
                if (this.permisos.oficinaNombre) {
                    this.$el.find('#filtro-oficina').html('<option value="' + this.permisos.oficinaUsuario + '">' + this.escape(this.permisos.oficinaNombre) + '</option>');
                    this.$el.find('#filtro-oficina').val(this.permisos.oficinaUsuario);
                }
                this.$el.find('#filtro-asesor').prop('disabled', false);
            }
            
            if (this.permisos && this.permisos.esCasaNacional) {
                this.$el.find('#filtro-cla').prop('disabled', false);
                this.$el.find('#filtro-oficina').prop('disabled', false);
                this.$el.find('#filtro-asesor').prop('disabled', false);
            }
        },

        aplicarVisibilidadFiltros: function () {
            if (!this.permisos) return;
            
            var p = this.permisos;
            
            if (p.esCasaNacional) {
                this.$el.find('#filtro-cla-group, #filtro-oficina-group, #filtro-asesor-group').show();
            } else if (p.tieneRolesGestion) {
                this.$el.find('#filtro-cla-group, #filtro-oficina-group').hide();
                this.$el.find('#filtro-asesor-group').show();
            } else {
                this.$el.find('#filtro-cla-group, #filtro-oficina-group, #filtro-asesor-group').hide();
            }
        },

        cargarSelectsIniciales: function () {
            var self = this;
            var p = this.permisos;
            
            if (p.esCasaNacional && p.clasDisponibles && p.clasDisponibles.length) {
                var $claSelect = this.$el.find('#filtro-cla');
                $claSelect.empty().append('<option value="">Todos los CLAs</option>');
                p.clasDisponibles.forEach(function (cla) {
                    $claSelect.append('<option value="' + cla.id + '">' + self.escape(cla.name) + '</option>');
                });
                $claSelect.prop('disabled', false);
            }
            
            if (p.tieneRolesGestion && p.oficinaUsuario) {
                var $oficinaSelect = this.$el.find('#filtro-oficina');
                $oficinaSelect.empty().append('<option value="' + p.oficinaUsuario + '">' + self.escape(p.oficinaNombre || 'Oficina asignada') + '</option>').prop('disabled', true);
                
                var $asesorSelect = this.$el.find('#filtro-asesor');
                $asesorSelect.empty().append('<option value="">Cargando asesores...</option>').prop('disabled', true);
                
                if (p.oficinaUsuario) {
                    this.cargarAsesoresPorOficina(p.oficinaUsuario);
                }
            }
            
            if (p.esAsesor) {
                this.$el.find('#filtro-asesor-group').hide();
            }
        },

        onCLAChange: function (claId) {
            var self = this;
            var $oficinaSelect = this.$el.find('#filtro-oficina');
            var $asesorSelect = this.$el.find('#filtro-asesor');
            
            if (!claId) {
                $oficinaSelect.html('<option value="">Todas las oficinas</option>').prop('disabled', false);
                $asesorSelect.html('<option value="">Todos los asesores</option>').prop('disabled', false);
                return;
            }
            
            $oficinaSelect.html('<option value="">Cargando oficinas...</option>').prop('disabled', true);
            $asesorSelect.html('<option value="">Seleccione una oficina</option>').prop('disabled', true);
            
            Espo.Ajax.getRequest('AvePrincipal/action/getOficinasByCLA', { claId: claId })
                .then(function (response) {
                    if (response.success && response.data) {
                        $oficinaSelect.empty();
                        $oficinaSelect.append('<option value="">Todas las oficinas</option>');
                        response.data.forEach(function (oficina) {
                            if (oficina.id && oficina.name && oficina.name.trim() !== '') {
                                $oficinaSelect.append('<option value="' + oficina.id + '">' + self.escape(oficina.name.trim()) + '</option>');
                            }
                        });
                        $oficinaSelect.prop('disabled', false);
                    } else {
                        $oficinaSelect.html('<option value="">Error al cargar oficinas</option>').prop('disabled', false);
                    }
                })
                .catch(function () {
                    $oficinaSelect.html('<option value="">Error al cargar oficinas</option>').prop('disabled', false);
                });
        },

        onOficinaChange: function (oficinaId) {
            if (oficinaId && oficinaId !== '') {
                this.cargarAsesoresPorOficina(oficinaId);
            } else {
                var $asesorSelect = this.$el.find('#filtro-asesor');
                $asesorSelect.html('<option value="">Todos los asesores</option>').prop('disabled', false);
            }
        },

        cargarAsesoresPorOficina: function (oficinaId) {
            var self = this;
            var $asesorSelect = this.$el.find('#filtro-asesor');
            
            if (!oficinaId || oficinaId === '') {
                $asesorSelect.html('<option value="">Todos los asesores</option>').prop('disabled', false);
                return;
            }
            
            $asesorSelect.html('<option value="">Cargando asesores...</option>').prop('disabled', true);
            
            Espo.Ajax.getRequest('AvePrincipal/action/getAsesoresByOficina', { oficinaId: oficinaId })
                .then(function (response) {
                    if (response.success && response.data && response.data.length) {
                        $asesorSelect.empty();
                        $asesorSelect.append('<option value="">Todos los asesores</option>');
                        response.data.forEach(function (asesor) {
                            if (asesor.id && asesor.name && asesor.name.trim() !== '') {
                                $asesorSelect.append('<option value="' + asesor.id + '">' + self.escape(asesor.name.trim()) + '</option>');
                            }
                        });
                        $asesorSelect.prop('disabled', false);
                    } else {
                        $asesorSelect.html('<option value="">No hay asesores</option>').prop('disabled', false);
                    }
                })
                .catch(function () {
                    $asesorSelect.html('<option value="">Error al cargar asesores</option>').prop('disabled', false);
                });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
        },

        aplicarFiltrosYRecargar: function () {
            var claVal = this.$el.find('#filtro-cla').val();
            var oficinaVal = this.$el.find('#filtro-oficina').val();
            var asesorVal = this.$el.find('#filtro-asesor').val();
            var statusVal = this.$el.find('#filtro-status').val();
            
            this.filtros = {
                cla: (claVal && claVal !== '') ? claVal : null,
                oficina: (oficinaVal && oficinaVal !== '') ? oficinaVal : null,
                asesor: (asesorVal && asesorVal !== '') ? asesorVal : null,
                status: (statusVal && statusVal !== '') ? statusVal : null
            };
            
            if (this.permisos && this.permisos.esAsesor) {
                this.filtros.asesor = this.currentUserId;
                this.filtros.cla = null;
                this.filtros.oficina = null;
            }
            
            if (this.permisos && this.permisos.tieneRolesGestion && !this.permisos.esCasaNacional) {
                if (this.permisos.oficinaUsuario) {
                    this.filtros.oficina = this.permisos.oficinaUsuario;
                    this.filtros.cla = null;
                }
            }
            
            this.pagina = 1;
            this.cargarLista();
        },

        limpiarFiltros: function () {
            this.$el.find('#filtro-status').val('');
            this.aplicarFiltrosPorRol();
            
            if (this.permisos && this.permisos.esCasaNacional) {
                this.$el.find('#filtro-cla').val('');
                this.$el.find('#filtro-oficina').empty().append('<option value="">Todas las oficinas</option>').prop('disabled', false);
                this.$el.find('#filtro-asesor').empty().append('<option value="">Todos los asesores</option>').prop('disabled', false);
                this.filtros.cla = null;
                this.filtros.oficina = null;
                this.filtros.asesor = null;
            }
            
            this.filtros.status = null;
            this.pagina = 1;
            this.cargarLista();
        },

        cargarLista: function () {
            var self = this;
            
            this.$el.find('#ave-list-loading').show();
            this.$el.find('#ave-list-content').hide();

            var params = {
                pagina: this.pagina,
                porPagina: this.porPagina,
                asesor: this.filtros.asesor || '',
                status: this.filtros.status || '',
                claId: this.filtros.cla || '',
                oficinaId: this.filtros.oficina || '',
                userId: this.currentUserId
            };

            Espo.Ajax.getRequest('AvePrincipal/action/getLista', params)
                .then(function (response) {
                    self.$el.find('#ave-list-loading').hide();
                    self.$el.find('#ave-list-content').show();

                    if (response.success) {
                        self.datos = response.data.list || [];
                        self.totalRegistros = response.data.total || 0;
                        self.totalPaginas = response.data.totalPaginas || 0;
                        
                        self.renderizarTabla();
                        self.renderizarPaginacion();
                    } else {
                        Espo.Ui.error(response.error || 'Error al cargar la lista');
                        self.$el.find('#ave-list-content').show();
                    }
                })
                .catch(function () {
                    self.$el.find('#ave-list-loading').hide();
                    self.$el.find('#ave-list-content').show();
                    Espo.Ui.error('Error al cargar los avalúos');
                });
        },

        renderizarTabla: function () {
            var self = this;
            var $tbody = this.$el.find('#ave-list-tbody');
            var $noData = this.$el.find('#ave-no-data');
            var puedeAprobar = this.puedeAprobarOInvalidar();

            this.$el.find('#ave-total-count').text(this.totalRegistros);

            if (this.datos.length === 0) {
                $tbody.html('');
                $noData.show();
                this.$el.find('#ave-paginacion').hide();
                return;
            }

            $noData.hide();
            var offset = (this.pagina - 1) * this.porPagina;
            var html = '';

            this.datos.forEach(function (item, idx) {
                var fecha = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('es-ES')
                    : '-';
                var identificacion = (item.tipoIdentificacion ? item.tipoIdentificacion + ' ' : '') + (item.identificacionCliente || '-');
                var status = item.status || 'elaboracion';
                var statusInf = self.statusMap[status] || { texto: status, clase: '' };
                
                // Botones en formato vertical (uno debajo del otro)
                var actionButtons = '<div style="display:flex; flex-direction:column; gap:4px; align-items:center;">';
                
                // Botón Ver - visible para todos
                actionButtons += '<button class="ave-btn ave-btn-secondary ave-btn-sm" data-action="ver-ave" data-id="' + item.id + '" title="Ver" style="width:100%; min-width:80px;">';
                actionButtons += '<i class="fas fa-eye"></i> Ver';
                actionButtons += '</button>';
                
                if (status === 'impresion') {
                    // Botón Imprimir - visible para TODOS
                    actionButtons += '<button class="ave-btn ave-btn-primary ave-btn-sm" data-action="cambiar-status" data-id="' + item.id + '" data-status="' + status + '" data-accion="imprimir" style="width:100%; min-width:80px;" title="Imprimir">';
                    actionButtons += '<i class="fas fa-print"></i> Imprimir';
                    actionButtons += '</button>';
                }
                
                // Botones de Aprobar e Invalidar - SOLO para usuarios con permisos de gestión
                if (puedeAprobar) {
                    if (status === 'elaboracion') {
                        actionButtons += '<button class="ave-btn ave-btn-success ave-btn-sm" data-action="cambiar-status" data-id="' + item.id + '" data-status="' + status + '" data-accion="aprobar" style="width:100%; min-width:80px;" title="Aprobar">';
                        actionButtons += '<i class="fas fa-check"></i> Aprobar';
                        actionButtons += '</button>';
                    } else if (status === 'impresion') {
                        actionButtons += '<button class="ave-btn ave-btn-warning ave-btn-sm" data-action="cambiar-status" data-id="' + item.id + '" data-status="' + status + '" data-accion="invalidar" style="width:100%; min-width:80px;" title="Invalidar">';
                        actionButtons += '<i class="fas fa-undo-alt"></i> Invalidar';
                        actionButtons += '</button>';
                    }
                }
                
                actionButtons += '</div>';

                var ubicacionInmueble = self.formatearUbicacion(item);

                html += '<tr>';
                html += '<td style="text-align:center; font-weight:600;">' + (offset + idx + 1) + '</td>';
                html += '<td><strong>' + self.escape(item.numeroAve || '-') + '</strong></td>';
                html += '<td>' + self.escape(item.nombreCliente || '-') + '</td>';
                html += '<td>' + self.escape(identificacion) + '</td>';
                html += '<td>' + self.escape(ubicacionInmueble) + '</td>';
                html += '<td>' + self.escape(item.assignedUserName || '-') + '</td>';
                html += '<td>' + fecha + '</td>';
                html += '<td style="text-align:center;">';
                html += '<span class="ave-leyenda-badge ' + statusInf.clase + '">' + statusInf.texto + '</span>';
                html += '</td>';
                html += '<td style="text-align:center; min-width:90px;">';
                html += actionButtons;
                html += '</td>';
                html += '</tr>';
            });

            $tbody.html(html);
        },

        formatearUbicacion: function (item) {
            var partes = [];
            if (item.aveInmuebleUrbanizacion) partes.push(item.aveInmuebleUrbanizacion);
            if (item.aveInmuebleCiudad) partes.push(item.aveInmuebleCiudad);
            if (item.aveInmuebleEstado) partes.push(item.aveInmuebleEstado);
            
            if (partes.length > 0) {
                return partes.join(', ');
            }
            return item.aveInmuebleName || '-';
        },

        renderizarPaginacion: function () {
            if (this.totalPaginas <= 1) {
                this.$el.find('#ave-paginacion').hide();
                return;
            }
            this.$el.find('#ave-paginacion').show();
            var inicio = (this.pagina - 1) * this.porPagina + 1;
            var fin = Math.min(this.pagina * this.porPagina, this.totalRegistros);
            this.$el.find('#ave-page-info').text('Mostrando ' + inicio + '-' + fin + ' de ' + this.totalRegistros);

            var html = '';
            html += '<button class="ave-pag-btn ' + (this.pagina === 1 ? 'disabled' : '') + '" data-pagina="' + (this.pagina - 1) + '" ' + (this.pagina === 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left"></i></button>';
            var ini = Math.max(1, this.pagina - 2);
            var fin2 = Math.min(this.totalPaginas, this.pagina + 2);
            if (ini > 1) { html += '<button class="ave-pag-btn" data-pagina="1">1</button>'; if (ini > 2) html += '<span style="padding:0 4px;">…</span>'; }
            for (var i = ini; i <= fin2; i++) {
                html += '<button class="ave-pag-btn ' + (i === this.pagina ? 'active' : '') + '" data-pagina="' + i + '">' + i + '</button>';
            }
            if (fin2 < this.totalPaginas) { if (fin2 < this.totalPaginas - 1) html += '<span style="padding:0 4px;">…</span>'; html += '<button class="ave-pag-btn" data-pagina="' + this.totalPaginas + '">' + this.totalPaginas + '</button>'; }
            html += '<button class="ave-pag-btn ' + (this.pagina === this.totalPaginas ? 'disabled' : '') + '" data-pagina="' + (this.pagina + 1) + '" ' + (this.pagina === this.totalPaginas ? 'disabled' : '') + '><i class="fas fa-chevron-right"></i></button>';

            this.$el.find('#ave-pag-controles').html(html);
        },

        cambiarStatus: function (id, statusActual, accion) {
            var self = this;
            
            if (statusActual === 'elaboracion' && accion === 'aprobar') {
                if (!confirm('¿Está seguro de aprobar este AVE? Pasará a estado "Listo para Imprimir".')) return;
                
                var $btn = this.$el.find('[data-action="cambiar-status"][data-id="' + id + '"][data-accion="aprobar"]');
                var originalHtml = $btn.html();
                $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
                
                Espo.Ajax.postRequest('AvePrincipal/action/cambiarStatus', {
                    aveId: id,
                    status: 'impresion'
                }).then(function (response) {
                    if (response.success) {
                        Espo.Ui.success('AVE aprobado correctamente');
                        self.pagina = 1;
                        self.cargarLista();
                    } else {
                        Espo.Ui.error(response.error || 'Error al cambiar estado');
                        $btn.prop('disabled', false).html(originalHtml);
                    }
                }).catch(function () {
                    Espo.Ui.error('Error al cambiar el estado');
                    $btn.prop('disabled', false).html(originalHtml);
                });
            } 
            else if (statusActual === 'impresion' && accion === 'imprimir') {
                if (!confirm('¿Desea imprimir el reporte de este AVE?')) return;
                window.open('api/v1/AvePrincipal/action/generarPdf?aveId=' + id, '_blank');
                Espo.Ui.success('Generando PDF...');
            }
            else if (statusActual === 'impresion' && accion === 'invalidar') {
                if (!confirm('¿Está seguro de invalidar este AVE? Volverá a estado "En Elaboración".')) return;
                
                var $btn = this.$el.find('[data-action="cambiar-status"][data-id="' + id + '"][data-accion="invalidar"]');
                var originalHtml = $btn.html();
                $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
                
                Espo.Ajax.postRequest('AvePrincipal/action/cambiarStatus', {
                    aveId: id,
                    status: 'elaboracion'
                }).then(function (response) {
                    if (response.success) {
                        Espo.Ui.success('AVE invalidado. Estado: En Elaboración');
                        self.pagina = 1;
                        self.cargarLista();
                    } else {
                        Espo.Ui.error(response.error || 'Error al cambiar estado');
                        $btn.prop('disabled', false).html(originalHtml);
                    }
                }).catch(function () {
                    Espo.Ui.error('Error al cambiar el estado');
                    $btn.prop('disabled', false).html(originalHtml);
                });
            }
        },

        crearNuevo: function () {
            var self = this;
            var userId = this.currentUserId;
            
            Espo.Ajax.postRequest('AvePrincipal', { 
                name: 'Nuevo AVE',
                assignedUserId: userId
            })
            .then(function (response) {
                if (response && response.id) {
                    self.getRouter().navigate('#AvePrincipal/view/' + response.id, { trigger: true });
                } else if (response && response.success === false) {
                    Espo.Ui.error(response.error || 'No se pudo crear el avalúo');
                } else {
                    Espo.Ui.error('No se pudo crear el avalúo: respuesta inválida');
                }
            })
            .catch(function () {
                Espo.Ui.error('Error al crear el avalúo');
            });
        },

        verAve: function (id) {
            if (id) this.getRouter().navigate('#AvePrincipal/view/' + id, { trigger: true });
        },

        escape: function (text) {
            if (!text) return '';
            return String(text).replace(/[&<>"']/g, function (m) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
            });
        }
    });
});