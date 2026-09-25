// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      alert_notifications: {
        Row: {
          alert_rule_id: string
          daily_report_id: string
          id: string
          is_read: boolean
          message: string
          triggered_at: string
        }
        Insert: {
          alert_rule_id: string
          daily_report_id: string
          id?: string
          is_read?: boolean
          message: string
          triggered_at?: string
        }
        Update: {
          alert_rule_id?: string
          daily_report_id?: string
          id?: string
          is_read?: boolean
          message?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'alert_notifications_alert_rule_id_fkey'
            columns: ['alert_rule_id']
            isOneToOne: false
            referencedRelation: 'alert_rules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'alert_notifications_daily_report_id_fkey'
            columns: ['daily_report_id']
            isOneToOne: false
            referencedRelation: 'daily_production_reports'
            referencedColumns: ['id']
          },
        ]
      }
      alert_rules: {
        Row: {
          condition: string
          created_at: string
          id: string
          metric_field: string
          name: string
          project_id: string
          threshold_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          metric_field: string
          name: string
          project_id: string
          threshold_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          metric_field?: string
          name?: string
          project_id?: string
          threshold_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'alert_rules_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_value: string | null
          old_value: string | null
          operation_type: string
          project_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          operation_type: string
          project_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          operation_type?: string
          project_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      calibration_data: {
        Row: {
          created_at: string
          fcv: number | null
          height_mm: number
          id: string
          tank_id: string
          volume_m3: number
        }
        Insert: {
          created_at?: string
          fcv?: number | null
          height_mm: number
          id?: string
          tank_id: string
          volume_m3: number
        }
        Update: {
          created_at?: string
          fcv?: number | null
          height_mm?: number
          id?: string
          tank_id?: string
          volume_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: 'calibration_data_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
        ]
      }
      daily_production_reports: {
        Row: {
          calculated_well_production_m3: number | null
          closed_at: string | null
          closed_by: string | null
          corrected_oil_volume_m3: number | null
          created_at: string | null
          density_at_20c_gcm3: number | null
          drained_volume_m3: number | null
          emulsion_bsw_percent: number | null
          emulsion_water_volume_m3: number | null
          end_datetime: string
          fcv: number | null
          fe: number | null
          fluid_temp_c: number | null
          id: string
          report_date: string
          start_datetime: string
          status: string
          stock_variation: number | null
          tank_id: string
          temp_correction_factor_y: number | null
          total_bsw_percent: number | null
          transfer_observed_density_gcm3: number | null
          transferred_volume_m3: number | null
          uncorrected_oil_volume_m3: number | null
          updated_at: string | null
          well_id: string | null
        }
        Insert: {
          calculated_well_production_m3?: number | null
          closed_at?: string | null
          closed_by?: string | null
          corrected_oil_volume_m3?: number | null
          created_at?: string | null
          density_at_20c_gcm3?: number | null
          drained_volume_m3?: number | null
          emulsion_bsw_percent?: number | null
          emulsion_water_volume_m3?: number | null
          end_datetime: string
          fcv?: number | null
          fe?: number | null
          fluid_temp_c?: number | null
          id?: string
          report_date: string
          start_datetime: string
          status?: string
          stock_variation?: number | null
          tank_id: string
          temp_correction_factor_y?: number | null
          total_bsw_percent?: number | null
          transfer_observed_density_gcm3?: number | null
          transferred_volume_m3?: number | null
          uncorrected_oil_volume_m3?: number | null
          updated_at?: string | null
          well_id?: string | null
        }
        Update: {
          calculated_well_production_m3?: number | null
          closed_at?: string | null
          closed_by?: string | null
          corrected_oil_volume_m3?: number | null
          created_at?: string | null
          density_at_20c_gcm3?: number | null
          drained_volume_m3?: number | null
          emulsion_bsw_percent?: number | null
          emulsion_water_volume_m3?: number | null
          end_datetime?: string
          fcv?: number | null
          fe?: number | null
          fluid_temp_c?: number | null
          id?: string
          report_date?: string
          start_datetime?: string
          status?: string
          stock_variation?: number | null
          tank_id?: string
          temp_correction_factor_y?: number | null
          total_bsw_percent?: number | null
          transfer_observed_density_gcm3?: number | null
          transferred_volume_m3?: number | null
          uncorrected_oil_volume_m3?: number | null
          updated_at?: string | null
          well_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'daily_production_reports_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'daily_production_reports_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      fcv_calculation_logs: {
        Row: {
          algorithm_version: string
          applied_norm: string
          calculated_at: string
          calculation_reason: string | null
          density_at_20c_gcm3: number
          fcv: number
          fluid_temp_c: number
          id: string
          observed_density_gcm3: number
          pressure_kpag: number
          reference_base: string
          requested_by_user_id: string | null
          user_id: string
        }
        Insert: {
          algorithm_version: string
          applied_norm?: string
          calculated_at?: string
          calculation_reason?: string | null
          density_at_20c_gcm3: number
          fcv: number
          fluid_temp_c: number
          id?: string
          observed_density_gcm3: number
          pressure_kpag?: number
          reference_base?: string
          requested_by_user_id?: string | null
          user_id: string
        }
        Update: {
          algorithm_version?: string
          applied_norm?: string
          calculated_at?: string
          calculation_reason?: string | null
          density_at_20c_gcm3?: number
          fcv?: number
          fluid_temp_c?: number
          id?: string
          observed_density_gcm3?: number
          pressure_kpag?: number
          reference_base?: string
          requested_by_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fcv_data: {
        Row: {
          created_at: string
          id: string
          raw_data: Json
          tank_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_data: Json
          tank_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_data?: Json
          tank_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fcv_data_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
        ]
      }
      operational_supervision: {
        Row: {
          audited_at: string | null
          audited_by: string | null
          created_at: string | null
          id: string
          justification_checklist: string | null
          justification_production: string | null
          project_id: string
          report_date: string
          status: string
          tank_id: string
        }
        Insert: {
          audited_at?: string | null
          audited_by?: string | null
          created_at?: string | null
          id?: string
          justification_checklist?: string | null
          justification_production?: string | null
          project_id: string
          report_date: string
          status?: string
          tank_id: string
        }
        Update: {
          audited_at?: string | null
          audited_by?: string | null
          created_at?: string | null
          id?: string
          justification_checklist?: string | null
          justification_production?: string | null
          project_id?: string
          report_date?: string
          status?: string
          tank_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'operational_supervision_audited_by_fkey'
            columns: ['audited_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'operational_supervision_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'operational_supervision_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
        ]
      }
      production_data: {
        Row: {
          corrected_oil_production: number | null
          created_at: string
          date: string | null
          gross_production: number | null
          id: string
          raw_data: Json
          tank_id: string
          total_water_production: number | null
          uncorrected_oil_production: number | null
        }
        Insert: {
          corrected_oil_production?: number | null
          created_at?: string
          date?: string | null
          gross_production?: number | null
          id?: string
          raw_data: Json
          tank_id: string
          total_water_production?: number | null
          uncorrected_oil_production?: number | null
        }
        Update: {
          corrected_oil_production?: number | null
          created_at?: string
          date?: string | null
          gross_production?: number | null
          id?: string
          raw_data?: Json
          tank_id?: string
          total_water_production?: number | null
          uncorrected_oil_production?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'production_data_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
        ]
      }
      production_fields: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'production_fields_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database['public']['Enums']['project_role']
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database['public']['Enums']['project_role']
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database['public']['Enums']['project_role']
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      project_team_roles: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database['public']['Enums']['project_role']
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database['public']['Enums']['project_role']
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database['public']['Enums']['project_role']
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_team_roles_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_team_roles_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          module_type: string | null
          name: string
          project_scope: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          module_type?: string | null
          name: string
          project_scope?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          module_type?: string | null
          name?: string
          project_scope?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sbp_assets: {
        Row: {
          acquisition_date: string | null
          acquisition_value: number | null
          asset_number: string
          category: string
          created_at: string
          description: string
          estimated_useful_life: number | null
          id: string
          location: string | null
          project_id: string
          responsible: string | null
          situation: string
          updated_at: string
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_value?: number | null
          asset_number: string
          category: string
          created_at?: string
          description: string
          estimated_useful_life?: number | null
          id?: string
          location?: string | null
          project_id: string
          responsible?: string | null
          situation: string
          updated_at?: string
        }
        Update: {
          acquisition_date?: string | null
          acquisition_value?: number | null
          asset_number?: string
          category?: string
          created_at?: string
          description?: string
          estimated_useful_life?: number | null
          id?: string
          location?: string | null
          project_id?: string
          responsible?: string | null
          situation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sbp_assets_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      seal_event_movements: {
        Row: {
          created_at: string
          event_id: string
          id: string
          movement_order: number
          movement_type: string
          seal_number: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          movement_order: number
          movement_type: string
          seal_number: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          movement_order?: number
          movement_type?: string
          seal_number?: string
        }
        Relationships: [
          {
            foreignKeyName: 'seal_event_movements_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'seal_events'
            referencedColumns: ['id']
          },
        ]
      }
      seal_events: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          event_sequence: number
          event_type: string
          final_position: string | null
          id: string
          installed_at: string | null
          installed_by_name: string | null
          observations: string | null
          rejection_reason: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by_name: string | null
          seal_point_id: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          event_type: string
          final_position?: string | null
          id?: string
          installed_at?: string | null
          installed_by_name?: string | null
          observations?: string | null
          rejection_reason?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by_name?: string | null
          seal_point_id: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          event_type?: string
          final_position?: string | null
          id?: string
          installed_at?: string | null
          installed_by_name?: string | null
          observations?: string | null
          rejection_reason?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by_name?: string | null
          seal_point_id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'seal_events_seal_point_id_fkey'
            columns: ['seal_point_id']
            isOneToOne: false
            referencedRelation: 'seal_points'
            referencedColumns: ['id']
          },
        ]
      }
      seal_points: {
        Row: {
          component_code: string
          component_name: string
          created_at: string
          created_by: string | null
          function_description: string | null
          id: string
          is_active: boolean
          location: string | null
          required_position: string
          tag: string | null
          tank_id: string
          updated_at: string
        }
        Insert: {
          component_code: string
          component_name: string
          created_at?: string
          created_by?: string | null
          function_description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          required_position: string
          tag?: string | null
          tank_id: string
          updated_at?: string
        }
        Update: {
          component_code?: string
          component_name?: string
          created_at?: string
          created_by?: string | null
          function_description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          required_position?: string
          tag?: string | null
          tank_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'seal_points_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
        ]
      }
      seal_data: {
        Row: {
          created_at: string
          date: string | null
          id: string
          raw_data: Json
          tank_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          raw_data: Json
          tank_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          raw_data?: Json
          tank_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'seal_data_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
        ]
      }
      sgp_action_plans: {
        Row: {
          action_plan: string | null
          comment: string
          created_at: string | null
          created_by: string | null
          id: string
          kpi_type: string
          report_date: string
          status: string
          updated_at: string | null
          well_id: string
        }
        Insert: {
          action_plan?: string | null
          comment: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          kpi_type: string
          report_date: string
          status?: string
          updated_at?: string | null
          well_id: string
        }
        Update: {
          action_plan?: string | null
          comment?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          kpi_type?: string
          report_date?: string
          status?: string
          updated_at?: string | null
          well_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sgp_action_plans_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sgp_action_plans_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      sgp_daily_well_summary: {
        Row: {
          availability: number | null
          derate_minutes_weighted: number | null
          efo_oil: number | null
          explained_loss_m3: number | null
          id: string
          ipnp_oil_m3: number | null
          loss_oil_m3: number | null
          pot_liq_24h_m3: number | null
          pot_oil_24h_m3: number | null
          pot_wat_24h_m3: number | null
          real_gas_m3: number | null
          real_liq_m3: number | null
          real_oil_m3: number | null
          real_wat_m3: number | null
          report_date: string
          sem_teste: boolean | null
          srt_test_id: string | null
          stop_minutes: number | null
          updated_at: string | null
          well_id: string
        }
        Insert: {
          availability?: number | null
          derate_minutes_weighted?: number | null
          efo_oil?: number | null
          explained_loss_m3?: number | null
          id?: string
          ipnp_oil_m3?: number | null
          loss_oil_m3?: number | null
          pot_liq_24h_m3?: number | null
          pot_oil_24h_m3?: number | null
          pot_wat_24h_m3?: number | null
          real_gas_m3?: number | null
          real_liq_m3?: number | null
          real_oil_m3?: number | null
          real_wat_m3?: number | null
          report_date: string
          sem_teste?: boolean | null
          srt_test_id?: string | null
          stop_minutes?: number | null
          updated_at?: string | null
          well_id: string
        }
        Update: {
          availability?: number | null
          derate_minutes_weighted?: number | null
          efo_oil?: number | null
          explained_loss_m3?: number | null
          id?: string
          ipnp_oil_m3?: number | null
          loss_oil_m3?: number | null
          pot_liq_24h_m3?: number | null
          pot_oil_24h_m3?: number | null
          pot_wat_24h_m3?: number | null
          real_gas_m3?: number | null
          real_liq_m3?: number | null
          real_oil_m3?: number | null
          real_wat_m3?: number | null
          report_date?: string
          sem_teste?: boolean | null
          srt_test_id?: string | null
          stop_minutes?: number | null
          updated_at?: string | null
          well_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sgp_daily_well_summary_srt_test_id_fkey'
            columns: ['srt_test_id']
            isOneToOne: false
            referencedRelation: 'srt_well_tests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sgp_daily_well_summary_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      sgp_targets: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          period_end: string
          period_start: string
          production_field_id: string | null
          target_availability: number | null
          target_efo_oil: number | null
          updated_at: string | null
          well_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          period_end: string
          period_start: string
          production_field_id?: string | null
          target_availability?: number | null
          target_efo_oil?: number | null
          updated_at?: string | null
          well_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          production_field_id?: string | null
          target_availability?: number | null
          target_efo_oil?: number | null
          updated_at?: string | null
          well_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sgp_targets_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sgp_targets_production_field_id_fkey'
            columns: ['production_field_id']
            isOneToOne: false
            referencedRelation: 'production_fields'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sgp_targets_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      sgpa_assets: {
        Row: {
          active: boolean | null
          asset_type: Database['public']['Enums']['sgpa_asset_type']
          created_at: string | null
          id: string
          tag: string
          updated_at: string | null
          well_id: string
        }
        Insert: {
          active?: boolean | null
          asset_type: Database['public']['Enums']['sgpa_asset_type']
          created_at?: string | null
          id?: string
          tag: string
          updated_at?: string | null
          well_id: string
        }
        Update: {
          active?: boolean | null
          asset_type?: Database['public']['Enums']['sgpa_asset_type']
          created_at?: string | null
          id?: string
          tag?: string
          updated_at?: string | null
          well_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sgpa_assets_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      sgpa_causes: {
        Row: {
          category: Database['public']['Enums']['sgpa_cause_category']
          cause_name: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          category: Database['public']['Enums']['sgpa_cause_category']
          cause_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: Database['public']['Enums']['sgpa_cause_category']
          cause_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sgpa_events: {
        Row: {
          asset_id: string | null
          attachments: string[] | null
          category: Database['public']['Enums']['sgpa_cause_category']
          cause_id: string | null
          created_at: string | null
          duration_min: number | null
          end_at: string | null
          estimated_loss_m3: number | null
          event_date: string
          event_type: Database['public']['Enums']['sgpa_event_type']
          failure_flag: boolean | null
          id: string
          impact_factor: number | null
          notes: string | null
          responsible_user_id: string | null
          start_at: string
          status: Database['public']['Enums']['sgpa_event_status']
          updated_at: string | null
          well_id: string
          work_order_ref: string | null
        }
        Insert: {
          asset_id?: string | null
          attachments?: string[] | null
          category: Database['public']['Enums']['sgpa_cause_category']
          cause_id?: string | null
          created_at?: string | null
          duration_min?: number | null
          end_at?: string | null
          estimated_loss_m3?: number | null
          event_date: string
          event_type: Database['public']['Enums']['sgpa_event_type']
          failure_flag?: boolean | null
          id?: string
          impact_factor?: number | null
          notes?: string | null
          responsible_user_id?: string | null
          start_at: string
          status?: Database['public']['Enums']['sgpa_event_status']
          updated_at?: string | null
          well_id: string
          work_order_ref?: string | null
        }
        Update: {
          asset_id?: string | null
          attachments?: string[] | null
          category?: Database['public']['Enums']['sgpa_cause_category']
          cause_id?: string | null
          created_at?: string | null
          duration_min?: number | null
          end_at?: string | null
          estimated_loss_m3?: number | null
          event_date?: string
          event_type?: Database['public']['Enums']['sgpa_event_type']
          failure_flag?: boolean | null
          id?: string
          impact_factor?: number | null
          notes?: string | null
          responsible_user_id?: string | null
          start_at?: string
          status?: Database['public']['Enums']['sgpa_event_status']
          updated_at?: string | null
          well_id?: string
          work_order_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sgpa_events_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'sgpa_assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sgpa_events_cause_id_fkey'
            columns: ['cause_id']
            isOneToOne: false
            referencedRelation: 'sgpa_causes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sgpa_events_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sgpa_events_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      smt_equipment: {
        Row: {
          acquisition_date: string | null
          category: string
          code: string
          cost_center: string | null
          created_at: string
          id: string
          location: string | null
          manufacturer: string | null
          model: string | null
          name: string
          parent_id: string | null
          project_id: string
          sbp_asset_id: string | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acquisition_date?: string | null
          category: string
          code: string
          cost_center?: string | null
          created_at?: string
          id?: string
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          parent_id?: string | null
          project_id: string
          sbp_asset_id?: string | null
          serial_number?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          acquisition_date?: string | null
          category?: string
          code?: string
          cost_center?: string | null
          created_at?: string
          id?: string
          location?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          parent_id?: string | null
          project_id?: string
          sbp_asset_id?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'smt_equipment_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'smt_equipment'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'smt_equipment_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'smt_equipment_sbp_asset_id_fkey'
            columns: ['sbp_asset_id']
            isOneToOne: false
            referencedRelation: 'sbp_assets'
            referencedColumns: ['id']
          },
        ]
      }
      smt_maintenance_logs: {
        Row: {
          action_taken: string | null
          cause: string | null
          created_at: string
          end_at: string | null
          equipment_id: string
          failure_description: string | null
          id: string
          preventive_plan_id: string | null
          project_id: string
          responsible_user_id: string | null
          start_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          cause?: string | null
          created_at?: string
          end_at?: string | null
          equipment_id: string
          failure_description?: string | null
          id?: string
          preventive_plan_id?: string | null
          project_id: string
          responsible_user_id?: string | null
          start_at?: string | null
          status: string
          type: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          cause?: string | null
          created_at?: string
          end_at?: string | null
          equipment_id?: string
          failure_description?: string | null
          id?: string
          preventive_plan_id?: string | null
          project_id?: string
          responsible_user_id?: string | null
          start_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'smt_maintenance_logs_equipment_id_fkey'
            columns: ['equipment_id']
            isOneToOne: false
            referencedRelation: 'smt_equipment'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'smt_maintenance_logs_preventive_plan_id_fkey'
            columns: ['preventive_plan_id']
            isOneToOne: false
            referencedRelation: 'smt_preventive_plans'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'smt_maintenance_logs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'smt_maintenance_logs_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      smt_preventive_plans: {
        Row: {
          checklist: Json | null
          created_at: string
          equipment_id: string
          id: string
          interval: number
          next_scheduled_date: string | null
          periodicity_type: string
          project_id: string
          updated_at: string
        }
        Insert: {
          checklist?: Json | null
          created_at?: string
          equipment_id: string
          id?: string
          interval: number
          next_scheduled_date?: string | null
          periodicity_type: string
          project_id: string
          updated_at?: string
        }
        Update: {
          checklist?: Json | null
          created_at?: string
          equipment_id?: string
          id?: string
          interval?: number
          next_scheduled_date?: string | null
          periodicity_type?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'smt_preventive_plans_equipment_id_fkey'
            columns: ['equipment_id']
            isOneToOne: false
            referencedRelation: 'smt_equipment'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'smt_preventive_plans_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      srt_mobile_tank_calibration: {
        Row: {
          created_at: string | null
          fcv: number | null
          height_mm: number
          id: string
          tank_id: string
          volume_m3: number
        }
        Insert: {
          created_at?: string | null
          fcv?: number | null
          height_mm: number
          id?: string
          tank_id: string
          volume_m3: number
        }
        Update: {
          created_at?: string | null
          fcv?: number | null
          height_mm?: number
          id?: string
          tank_id?: string
          volume_m3?: number
        }
        Relationships: [
          {
            foreignKeyName: 'srt_mobile_tank_calibration_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'srt_mobile_tanks'
            referencedColumns: ['id']
          },
        ]
      }
      srt_mobile_tanks: {
        Row: {
          active: boolean | null
          capacity: number | null
          created_at: string | null
          id: string
          notes: string | null
          project_id: string | null
          tank_name: string
          unit: string | null
          updated_at: string | null
          well_id: string | null
        }
        Insert: {
          active?: boolean | null
          capacity?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          tank_name: string
          unit?: string | null
          updated_at?: string | null
          well_id?: string | null
        }
        Update: {
          active?: boolean | null
          capacity?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          tank_name?: string
          unit?: string | null
          updated_at?: string | null
          well_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'srt_mobile_tanks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'srt_mobile_tanks_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      srt_tank_sessions: {
        Row: {
          created_at: string | null
          end_at: string | null
          id: string
          notes: string | null
          project_id: string | null
          responsible_user_id: string | null
          start_at: string
          tank_id: string
          updated_at: string | null
          well_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          responsible_user_id?: string | null
          start_at: string
          tank_id: string
          updated_at?: string | null
          well_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_at?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          responsible_user_id?: string | null
          start_at?: string
          tank_id?: string
          updated_at?: string | null
          well_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'srt_tank_sessions_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'srt_tank_sessions_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'srt_tank_sessions_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'srt_mobile_tanks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'srt_tank_sessions_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      srt_well_tests: {
        Row: {
          after_drainage_height_mm: number | null
          analysis_notes: string | null
          bsw_emulsion_pct: number | null
          bsw_method: string | null
          bsw_quality: string | null
          created_at: string | null
          density: number | null
          density_ref_temp: number | null
          fcv: number | null
          fdt: number | null
          final_height_mm: number | null
          final_level_volume_m3: number | null
          fe: number | null
          ftc: number | null
          id: string
          initial_height_mm: number | null
          initial_level_volume_m3: number | null
          ipsw_unit: string | null
          ipsw_value: number | null
          lab_report_attachment: string | null
          notes: string | null
          responsible_user_id: string | null
          session_id: string
          source_bsw_test_id: string | null
          status: Database['public']['Enums']['srt_test_status']
          temperature_avg: number | null
          test_end_at: string
          test_start_at: string
          test_type: Database['public']['Enums']['srt_test_type']
          total_height_mm: number | null
          emulsion_height_mm: number | null
          emulsion_level_volume_m3: number | null
          updated_at: string | null
          v_emulsion: number | null
          v_free_water: number | null
          v_gas_test: number | null
          v_liq_test: number | null
          v_oil_corrected: number | null
          v_oil_test: number | null
          v_wat_test: number | null
          v_water_in_emulsion: number | null
          v_water_total: number | null
          well_id: string
        }
        Insert: {
          after_drainage_height_mm?: number | null
          analysis_notes?: string | null
          bsw_emulsion_pct?: number | null
          bsw_method?: string | null
          bsw_quality?: string | null
          created_at?: string | null
          density?: number | null
          density_ref_temp?: number | null
          fcv?: number | null
          fdt?: number | null
          final_height_mm?: number | null
          final_level_volume_m3?: number | null
          fe?: number | null
          ftc?: number | null
          id?: string
          initial_height_mm?: number | null
          initial_level_volume_m3?: number | null
          ipsw_unit?: string | null
          ipsw_value?: number | null
          lab_report_attachment?: string | null
          notes?: string | null
          responsible_user_id?: string | null
          session_id: string
          source_bsw_test_id?: string | null
          status?: Database['public']['Enums']['srt_test_status']
          temperature_avg?: number | null
          test_end_at: string
          test_start_at: string
          test_type?: Database['public']['Enums']['srt_test_type']
          total_height_mm?: number | null
          emulsion_height_mm?: number | null
          emulsion_level_volume_m3?: number | null
          updated_at?: string | null
          v_emulsion?: number | null
          v_free_water?: number | null
          v_gas_test?: number | null
          v_liq_test?: number | null
          v_oil_corrected?: number | null
          v_oil_test?: number | null
          v_wat_test?: number | null
          v_water_in_emulsion?: number | null
          v_water_total?: number | null
          well_id: string
        }
        Update: {
          after_drainage_height_mm?: number | null
          analysis_notes?: string | null
          bsw_emulsion_pct?: number | null
          bsw_method?: string | null
          bsw_quality?: string | null
          created_at?: string | null
          density?: number | null
          density_ref_temp?: number | null
          fcv?: number | null
          fdt?: number | null
          final_height_mm?: number | null
          final_level_volume_m3?: number | null
          fe?: number | null
          ftc?: number | null
          id?: string
          initial_height_mm?: number | null
          initial_level_volume_m3?: number | null
          ipsw_unit?: string | null
          ipsw_value?: number | null
          lab_report_attachment?: string | null
          notes?: string | null
          responsible_user_id?: string | null
          session_id?: string
          source_bsw_test_id?: string | null
          status?: Database['public']['Enums']['srt_test_status']
          temperature_avg?: number | null
          test_end_at?: string
          test_start_at?: string
          test_type?: Database['public']['Enums']['srt_test_type']
          total_height_mm?: number | null
          emulsion_height_mm?: number | null
          emulsion_level_volume_m3?: number | null
          updated_at?: string | null
          v_emulsion?: number | null
          v_free_water?: number | null
          v_gas_test?: number | null
          v_liq_test?: number | null
          v_oil_corrected?: number | null
          v_oil_test?: number | null
          v_wat_test?: number | null
          v_water_in_emulsion?: number | null
          v_water_total?: number | null
          well_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'srt_well_tests_source_bsw_test_id_fkey'
            columns: ['source_bsw_test_id']
            isOneToOne: false
            referencedRelation: 'srt_well_tests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'srt_well_tests_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'srt_well_tests_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'srt_tank_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'srt_well_tests_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      tank_operations: {
        Row: {
          bsw_percent: number | null
          comments: string | null
          created_at: string | null
          ctl: number | null
          daily_report_id: string | null
          density_observed_gcm3: number | null
          end_time: string
          fcv: number | null
          fe: number | null
          final_level_mm: number
          final_volume_m3: number | null
          id: string
          initial_level_mm: number
          initial_volume_m3: number | null
          oil_volume_m3: number | null
          start_time: string
          tank_id: string
          temp_ambient_c: number | null
          temp_fluid_c: number | null
          transfer_destination: string | null
          type: Database['public']['Enums']['operation_type']
          updated_at: string | null
          user_id: string
          volume_corrected_m3: number | null
          volume_m3: number | null
          water_volume_m3: number | null
          well_id: string | null
        }
        Insert: {
          bsw_percent?: number | null
          comments?: string | null
          created_at?: string | null
          ctl?: number | null
          daily_report_id?: string | null
          density_observed_gcm3?: number | null
          end_time: string
          fcv?: number | null
          fe?: number | null
          final_level_mm: number
          final_volume_m3?: number | null
          id?: string
          initial_level_mm: number
          initial_volume_m3?: number | null
          oil_volume_m3?: number | null
          start_time: string
          tank_id: string
          temp_ambient_c?: number | null
          temp_fluid_c?: number | null
          transfer_destination?: string | null
          type: Database['public']['Enums']['operation_type']
          updated_at?: string | null
          user_id: string
          volume_corrected_m3?: number | null
          volume_m3?: number | null
          water_volume_m3?: number | null
          well_id?: string | null
        }
        Update: {
          bsw_percent?: number | null
          comments?: string | null
          created_at?: string | null
          ctl?: number | null
          daily_report_id?: string | null
          density_observed_gcm3?: number | null
          end_time?: string
          fcv?: number | null
          fe?: number | null
          final_level_mm?: number
          final_volume_m3?: number | null
          id?: string
          initial_level_mm?: number
          initial_volume_m3?: number | null
          oil_volume_m3?: number | null
          start_time?: string
          tank_id?: string
          temp_ambient_c?: number | null
          temp_fluid_c?: number | null
          transfer_destination?: string | null
          type?: Database['public']['Enums']['operation_type']
          updated_at?: string | null
          user_id?: string
          volume_corrected_m3?: number | null
          volume_m3?: number | null
          water_volume_m3?: number | null
          well_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tank_operations_daily_report_id_fkey'
            columns: ['daily_report_id']
            isOneToOne: false
            referencedRelation: 'daily_production_reports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tank_operations_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tank_operations_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      tanks: {
        Row: {
          created_at: string
          geolocation: string | null
          id: string
          production_field_id: string
          project_id: string
          tag: string
          updated_at: string | null
          well_id: string | null
        }
        Insert: {
          created_at?: string
          geolocation?: string | null
          id?: string
          production_field_id: string
          project_id: string
          tag: string
          updated_at?: string | null
          well_id?: string | null
        }
        Update: {
          created_at?: string
          geolocation?: string | null
          id?: string
          production_field_id?: string
          project_id?: string
          tag?: string
          updated_at?: string | null
          well_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tanks_production_field_id_fkey'
            columns: ['production_field_id']
            isOneToOne: false
            referencedRelation: 'production_fields'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tanks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tanks_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database['public']['Enums']['team_role']
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['team_role']
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database['public']['Enums']['team_role']
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'team_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'teams_owner_user_id_fkey'
            columns: ['owner_user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      transfer_destination_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transfer_destination_categories_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      user_profiles: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string
          email_notification_preferences: Json
          full_name: string | null
          id: string
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email_notification_preferences?: Json
          full_name?: string | null
          id: string
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string
          email_notification_preferences?: Json
          full_name?: string | null
          id?: string
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Relationships: []
      }
      well_bsw_manual_entries: {
        Row: {
          bsw_emulsion_pct: number
          bsw_total_pct: number
          created_at: string
          emulsion_volume_m3: number
          emulsion_water_volume_m3: number
          free_water_volume_m3: number
          id: string
          measured_at: string
          oil_volume_m3: number
          report_date: string
          source_srt_test_id: string | null
          tank_id: string | null
          total_volume_m3: number
          total_water_volume_m3: number
          user_id: string | null
          well_id: string
        }
        Insert: {
          bsw_emulsion_pct?: number
          bsw_total_pct?: number
          created_at?: string
          emulsion_volume_m3?: number
          emulsion_water_volume_m3?: number
          free_water_volume_m3?: number
          id?: string
          measured_at?: string
          oil_volume_m3?: number
          report_date: string
          source_srt_test_id?: string | null
          tank_id?: string | null
          total_volume_m3?: number
          total_water_volume_m3?: number
          user_id?: string | null
          well_id: string
        }
        Update: {
          bsw_emulsion_pct?: number
          bsw_total_pct?: number
          created_at?: string
          emulsion_volume_m3?: number
          emulsion_water_volume_m3?: number
          free_water_volume_m3?: number
          id?: string
          measured_at?: string
          oil_volume_m3?: number
          report_date?: string
          source_srt_test_id?: string | null
          tank_id?: string | null
          total_volume_m3?: number
          total_water_volume_m3?: number
          user_id?: string | null
          well_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'well_bsw_manual_entries_source_srt_test_id_fkey'
            columns: ['source_srt_test_id']
            isOneToOne: false
            referencedRelation: 'srt_well_tests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'well_bsw_manual_entries_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'well_bsw_manual_entries_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'well_bsw_manual_entries_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      well_checklists: {
        Row: {
          anomaly_abnormal_noise: boolean | null
          anomaly_abnormal_return: boolean | null
          anomaly_electrical_issue: boolean | null
          anomaly_irregular_production: boolean | null
          anomaly_mechanical_issue: boolean | null
          anomaly_none: boolean | null
          anomaly_observation: string | null
          anomaly_pump_beat: boolean | null
          bm_cpm: number | null
          bm_diff_percent: number | null
          bm_efficiency_percent: number | null
          bm_mprl_lb: number | null
          bm_pd_m3d: number | null
          bm_peak_torque: number | null
          bm_pprl_lb: number | null
          bm_rods_percent: number | null
          created_at: string | null
          current_a: number | null
          date: string
          elevation_method: string
          freq_hz: number | null
          has_stopped: boolean
          hours_operating: number
          id: string
          motor_operating: boolean
          oil_level_status: string
          pr_bar: number | null
          pt_bar: number | null
          pumping_unit_abnormal_type: string | null
          pumping_unit_noise_vibration: boolean
          pumping_unit_normal: boolean
          pumping_unit_on: boolean
          reducer_no_leak: boolean
          rotation_rpm: number | null
          safety_area_safe: boolean
          safety_epi: boolean
          safety_leak_visible: boolean
          safety_observation: string | null
          stop_reason: string | null
          sub_gas_m: number | null
          sub_no_gas_m: number | null
          tank_id: string
          torque_percent: number | null
          updated_at: string | null
          user_id: string
          well_id: string | null
        }
        Insert: {
          anomaly_abnormal_noise?: boolean | null
          anomaly_abnormal_return?: boolean | null
          anomaly_electrical_issue?: boolean | null
          anomaly_irregular_production?: boolean | null
          anomaly_mechanical_issue?: boolean | null
          anomaly_none?: boolean | null
          anomaly_observation?: string | null
          anomaly_pump_beat?: boolean | null
          bm_cpm?: number | null
          bm_diff_percent?: number | null
          bm_efficiency_percent?: number | null
          bm_mprl_lb?: number | null
          bm_pd_m3d?: number | null
          bm_peak_torque?: number | null
          bm_pprl_lb?: number | null
          bm_rods_percent?: number | null
          created_at?: string | null
          current_a?: number | null
          date?: string
          elevation_method?: string
          freq_hz?: number | null
          has_stopped?: boolean
          hours_operating?: number
          id?: string
          motor_operating?: boolean
          oil_level_status?: string
          pr_bar?: number | null
          pt_bar?: number | null
          pumping_unit_abnormal_type?: string | null
          pumping_unit_noise_vibration?: boolean
          pumping_unit_normal?: boolean
          pumping_unit_on?: boolean
          reducer_no_leak?: boolean
          rotation_rpm?: number | null
          safety_area_safe?: boolean
          safety_epi?: boolean
          safety_leak_visible?: boolean
          safety_observation?: string | null
          stop_reason?: string | null
          sub_gas_m?: number | null
          sub_no_gas_m?: number | null
          tank_id: string
          torque_percent?: number | null
          updated_at?: string | null
          user_id: string
          well_id?: string | null
        }
        Update: {
          anomaly_abnormal_noise?: boolean | null
          anomaly_abnormal_return?: boolean | null
          anomaly_electrical_issue?: boolean | null
          anomaly_irregular_production?: boolean | null
          anomaly_mechanical_issue?: boolean | null
          anomaly_none?: boolean | null
          anomaly_observation?: string | null
          anomaly_pump_beat?: boolean | null
          bm_cpm?: number | null
          bm_diff_percent?: number | null
          bm_efficiency_percent?: number | null
          bm_mprl_lb?: number | null
          bm_pd_m3d?: number | null
          bm_peak_torque?: number | null
          bm_pprl_lb?: number | null
          bm_rods_percent?: number | null
          created_at?: string | null
          current_a?: number | null
          date?: string
          elevation_method?: string
          freq_hz?: number | null
          has_stopped?: boolean
          hours_operating?: number
          id?: string
          motor_operating?: boolean
          oil_level_status?: string
          pr_bar?: number | null
          pt_bar?: number | null
          pumping_unit_abnormal_type?: string | null
          pumping_unit_noise_vibration?: boolean
          pumping_unit_normal?: boolean
          pumping_unit_on?: boolean
          reducer_no_leak?: boolean
          rotation_rpm?: number | null
          safety_area_safe?: boolean
          safety_epi?: boolean
          safety_leak_visible?: boolean
          safety_observation?: string | null
          stop_reason?: string | null
          sub_gas_m?: number | null
          sub_no_gas_m?: number | null
          tank_id?: string
          torque_percent?: number | null
          updated_at?: string | null
          user_id?: string
          well_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'well_checklists_tank_id_fkey'
            columns: ['tank_id']
            isOneToOne: false
            referencedRelation: 'tanks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'well_checklists_well_id_fkey'
            columns: ['well_id']
            isOneToOne: false
            referencedRelation: 'wells'
            referencedColumns: ['id']
          },
        ]
      }
      wells: {
        Row: {
          created_at: string
          id: string
          name: string
          production_field_id: string
          short_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          production_field_id: string
          short_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          production_field_id?: string
          short_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'wells_production_field_id_fkey'
            columns: ['production_field_id']
            isOneToOne: false
            referencedRelation: 'production_fields'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      current_seal_state: {
        Row: {
          component_code: string | null
          component_name: string | null
          current_seal_numbers: string[] | null
          current_status: string | null
          final_position: string | null
          function_description: string | null
          is_active: boolean | null
          latest_event_approved_at: string | null
          latest_event_effective_at: string | null
          latest_event_id: string | null
          latest_event_sequence: number | null
          latest_event_type: string | null
          latest_installation_at: string | null
          latest_installed_by_name: string | null
          location: string | null
          observations: string | null
          production_field_id: string | null
          project_id: string | null
          required_position: string | null
          seal_point_id: string | null
          tag: string | null
          tank_id: string | null
          tank_tag: string | null
        }
        Relationships: []
      }
      unified_well_bsw: {
        Row: {
          bsw_emulsion_pct: number | null
          bsw_total_pct: number | null
          created_at: string | null
          date: string | null
          emulsion_volume_m3: number | null
          emulsion_water_volume_m3: number | null
          free_water_volume_m3: number | null
          id: string | null
          oil_volume_m3: number | null
          origin: string | null
          source_srt_test_id: string | null
          tank_id: string | null
          total_volume_m3: number | null
          total_water_volume_m3: number | null
          user_id: string | null
          well_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_edit_project: { Args: { _project_id: string }; Returns: boolean }
      consolidate_sgp_data: {
        Args: { p_report_date: string; p_well_id: string }
        Returns: undefined
      }
      get_current_test_by_well: {
        Args: { p_well_id: string }
        Returns: {
          after_drainage_height_mm: number | null
          analysis_notes: string | null
          bsw_emulsion_pct: number | null
          bsw_method: string | null
          bsw_quality: string | null
          created_at: string | null
          density: number | null
          density_ref_temp: number | null
          fcv: number | null
          fdt: number | null
          fe: number | null
          id: string
          ipsw_unit: string | null
          ipsw_value: number | null
          lab_report_attachment: string | null
          notes: string | null
          responsible_user_id: string | null
          session_id: string
          status: Database['public']['Enums']['srt_test_status']
          temperature_avg: number | null
          test_end_at: string
          test_start_at: string
          test_type: Database['public']['Enums']['srt_test_type']
          total_height_mm: number | null
          updated_at: string | null
          v_emulsion: number | null
          v_free_water: number | null
          v_gas_test: number | null
          v_liq_test: number | null
          v_oil_corrected: number | null
          v_oil_test: number | null
          v_wat_test: number | null
          v_water_in_emulsion: number | null
          v_water_total: number | null
          well_id: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'srt_well_tests'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_role: {
        Args: never
        Returns: Database['public']['Enums']['user_role']
      }
      import_calibration_data: {
        Args: { p_data: Json; p_tank_id: string }
        Returns: undefined
      }
      import_srt_calibration_data: {
        Args: { p_data: Json; p_tank_id: string }
        Returns: undefined
      }
      initialize_seal_points_from_spreadsheet: {
        Args: { p_tank_id: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_director: { Args: never; Returns: boolean }
      list_users_with_profiles: {
        Args: never
        Returns: {
          id: string
          email: string
          role: Database['public']['Enums']['user_role']
          full_name: string | null
          avatar_url: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }[]
      }
      is_member_of_project: { Args: { _project_id: string }; Returns: boolean }
      is_member_of_team: { Args: { _team_id: string }; Returns: boolean }
      is_project_owner: { Args: { _project_id: string }; Returns: boolean }
      is_team_admin: { Args: { _team_id: string }; Returns: boolean }
      is_team_owner: { Args: { _team_id: string }; Returns: boolean }
      register_seal_event: {
        Args: {
          p_event_type: string
          p_final_position?: string | null
          p_installed_at?: string | null
          p_installed_by_name?: string | null
          p_installed_seals?: string[]
          p_observations?: string | null
          p_removal_reason?: string | null
          p_removed_at?: string | null
          p_removed_by_name?: string | null
          p_removed_seals?: string[]
          p_seal_point_id: string
        }
        Returns: {
          event_id: string
          event_status: string
        }[]
      }
    }
    Enums: {
      operation_type: 'production' | 'drainage' | 'transfer' | 'stock_variation'
      project_role: 'owner' | 'editor' | 'viewer'
      sgpa_asset_type:
        | 'BCP'
        | 'Motor'
        | 'Inversor'
        | 'BM'
        | 'Coluna'
        | 'Válvula'
        | 'Linha'
        | 'Instrumentação'
        | 'Outro'
      sgpa_cause_category:
        | 'Operacional'
        | 'Mecânica'
        | 'Elétrica'
        | 'Processo'
        | 'Externa'
        | 'Segurança'
        | 'Medição'
      sgpa_event_status: 'OPEN' | 'CLOSED' | 'CANCELLED'
      sgpa_event_type: 'STOP' | 'DERATE'
      srt_test_status: 'rascunho' | 'valido' | 'invalido' | 'vigente'
      srt_test_type:
        | 'apropriacao'
        | 'operacional'
        | 'diagnostico'
        | 'comissionamento'
      team_role: 'team_admin' | 'team_member'
      user_role:
        | 'operator'
        | 'approver'
        | 'admin'
        | 'supervisor'
        | 'petroleum_engineer'
        | 'operations_manager'
        | 'director'
        | 'regulation'
        | 'maintenance'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      operation_type: ['production', 'drainage', 'transfer', 'stock_variation'],
      project_role: ['owner', 'editor', 'viewer'],
      sgpa_asset_type: [
        'BCP',
        'Motor',
        'Inversor',
        'BM',
        'Coluna',
        'Válvula',
        'Linha',
        'Instrumentação',
        'Outro',
      ],
      sgpa_cause_category: [
        'Operacional',
        'Mecânica',
        'Elétrica',
        'Processo',
        'Externa',
        'Segurança',
        'Medição',
      ],
      sgpa_event_status: ['OPEN', 'CLOSED', 'CANCELLED'],
      sgpa_event_type: ['STOP', 'DERATE'],
      srt_test_status: ['rascunho', 'valido', 'invalido', 'vigente'],
      srt_test_type: [
        'apropriacao',
        'operacional',
        'diagnostico',
        'comissionamento',
      ],
      team_role: ['team_admin', 'team_member'],
      user_role: [
        'operator',
        'approver',
        'admin',
        'supervisor',
        'petroleum_engineer',
        'operations_manager',
        'director',
        'regulation',
        'maintenance',
      ],
    },
  },
} as const
