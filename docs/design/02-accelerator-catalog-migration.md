# SYS-02 companion: retained accelerator catalog migration ledger

Status: proposed mapping, not a runtime migration. Date: 2026-09-20.
Baseline: master 8153f1c2f73c1890c897af83421b4f8e6446aa66.
Companion: [accelerator progression](02-accelerator-progression.md).

All 94 existing accelerator IDs appear once below; all 13 AMD records are retained.
The family and unit columns are proposed modeling roles inferred from the current inventory.
They do not certify numerical specifications, sale conditions or release dates.
Every real product needs item-specific sourcing before a normalized offer is enabled.

Physical assembly means a complete compatible host/platform must exist; a listed module is not
necessarily sold individually. Execution service means a verified service allowing the player's
weights, distinct from a hosted-model API. Internal fleet gives no public acquisition offer.
Legacy saves retain their old interpretation until an explicit migration is tested.

Mixed records require separate new products and a compatibility alias for the old ID. Existing
IDs are never reused with a different quantity basis. Unknown values remain unknown; no missing
power, price or bandwidth is filled with a convenient zero. Roadmap entries remain discoverable
without becoming purchasable before they have a qualified offer.

| Existing ID | Proposed family | Measurement/install unit to resolve | Offer path | Required review |
|---|---|---|---|---|
| amd_mi210 | Reused compute card | Card or platform-specific module | Qualified used assembly | Condition, variant, support, power and spares |
| amd_mi250x | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| amd_mi300a | Datacenter platform | Integrated CPU/GPU APU platform | Physical assembly / verified execution service | Do not double-count shared memory; keep distinct from MI300X |
| amd_mi300x | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| amd_mi325x | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| amd_mi350x | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| amd_mi355x | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| amd_mi400_mi455x | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Split MI455X/MI430X; preserve ambiguous legacy alias; no averaged SKU |
| amd_mi50_32gb | Reused compute card | Card or platform-specific module | Qualified used assembly | Condition, variant, support, power and spares |
| amd_radeon_ai_pro_r9700 | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| amd_rx_7900_xtx | Retail discrete card | PCIe card | Physical assembly | Variant memory, runtime, bus and physical fit |
| amd_rx_9070_xt | Retail discrete card | PCIe card | Physical assembly | Variant memory, runtime, bus and physical fit |
| amd_ryzen_ai_max_395 | Unified-memory appliance | Whole appliance | Physical appliance | Separate shared/host memory; whole-system power and price |
| apple_m2_ultra | Unified-memory appliance | Whole appliance | Physical appliance | Separate shared/host memory; whole-system power and price |
| apple_m3_ultra | Unified-memory appliance | Whole appliance | Physical appliance | Separate shared/host memory; whole-system power and price |
| apple_m4_max | Unified-memory appliance | Whole appliance | Physical appliance | Separate shared/host memory; whole-system power and price |
| apple_m5_max | Unified-memory appliance | Whole appliance | Physical appliance | Re-source announced/shipping configuration and whole-system totals |
| apple_m5_ultra | Unified-memory appliance | Whole appliance | Physical appliance | Re-source announced/shipping configuration and whole-system totals |
| aws_trainium2 | Provider tensor platform | Chip specification; capacity-slice offer | Execution service | Verify weights/runtime, slice topology, quota and dates |
| aws_trainium3 | Provider tensor platform | Chip specification; capacity-slice offer | Execution service | Reconcile 2026 field with Dec 2025 GA; preserve save timeline |
| biren_br100 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| biren_br104 | Datacenter platform | PCIe card in qualified host | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| cambricon_mlu370_x8 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| cambricon_mlu590 | Datacenter platform | Unresolved reference record | No new offer until qualified | Source physical unit and platform before enabling |
| cerebras_wse_3 | Specialized appliance | Wafer component plus CS-3 assembly | Contracted appliance / verified service | Separate SRAM, external memory and whole-system power |
| enflame_s60 | Datacenter platform | Unresolved reference record | No new offer until qualified | Source physical unit and platform before enabling |
| google_tpu_v5e | Provider tensor platform | Chip specification; capacity-slice offer | Execution service | Verify weights/runtime, slice topology, quota and dates |
| google_tpu_v5p | Provider tensor platform | Chip specification; capacity-slice offer | Execution service | Verify weights/runtime, slice topology, quota and dates |
| google_tpu_v6e_trillium | Provider tensor platform | Chip specification; capacity-slice offer | Execution service | Verify weights/runtime, slice topology, quota and dates |
| google_tpu_v7_ironwood | Provider tensor platform | Chip specification; capacity-slice offer | Execution service | Verify date and GB/GiB; distinguish chip, slice and pod |
| groq_lpu | Specialized appliance | Component/system boundary unresolved | Hosted service; execution only if documented | Re-source generation, memory, access and product identity |
| huawei_ascend_910b | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| huawei_ascend_910c | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| huawei_ascend_950dt | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| huawei_ascend_950pr | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| huawei_ascend_960 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Roadmap until variant/delivery confirmed; retain knowledge record |
| huawei_atlas_300i_duo | Datacenter platform | PCIe card in qualified host | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| huawei_cloudmatrix_384 | Datacenter platform | Complete multi-rack pod | Physical assembly / verified execution service | Separate components, switches and facility totals |
| hygon_dcu_k100_ai | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| intel_arc_b580 | Retail discrete card | PCIe card | Physical assembly | Variant memory, runtime, bus and physical fit |
| intel_arc_pro_b60 | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| intel_gaudi_2 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| intel_gaudi_3 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Split OAM/PCIe variants; no shared power/form-factor record |
| kunlunxin_p800 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| meta_mtia_500 | Provider tensor platform | Internal component specification | Internal fleet | No implied public rental or purchasable card |
| metax_c500 | Datacenter platform | Unresolved reference record | No new offer until qualified | Source physical unit and platform before enabling |
| microsoft_maia_100 | Provider tensor platform | Internal component specification | Internal fleet | No implied public rental or purchasable card |
| microsoft_maia_200 | Provider tensor platform | Internal component specification | Internal fleet | No implied public rental or purchasable card |
| moore_threads_mtt_s4000 | Datacenter platform | PCIe card in qualified host | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| nvidia_a10 | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_a100_40_pcie | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_a100_40_sxm4 | Professional/server card | SXM module in matching platform | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_a100_80_pcie | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_a100_80_sxm4 | Professional/server card | SXM module in matching platform | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_a10g | Professional/server card | PCIe card in qualified host | Execution service | AWS-specific board does not imply standalone physical offer |
| nvidia_a30 | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_b200 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| nvidia_b300 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| nvidia_b30a | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| nvidia_cmp_170hx | Reused compute card | Card or platform-specific module | Qualified used assembly | Condition, variant, support, power and spares |
| nvidia_cmp_90hx | Reused compute card | Card or platform-specific module | Qualified used assembly | Condition, variant, support, power and spares |
| nvidia_dgx_spark | Unified-memory appliance | Whole appliance | Physical appliance | Separate shared/host memory; whole-system power and price |
| nvidia_dgx_station_gb300 | Unified-memory appliance | Whole appliance | Physical appliance | Separate shared/host memory; whole-system power and price |
| nvidia_gb200_nvl72 | Datacenter platform | Complete 72-GPU rack | Physical assembly / verified execution service | Expand once; never count as one card |
| nvidia_gb300_nvl72 | Datacenter platform | Complete 72-GPU rack | Physical assembly / verified execution service | Expand once; never count as one card |
| nvidia_h100_nvl | Datacenter platform | Two-GPU paired product | Physical assembly / verified execution service | Preserve pair count; normalize memory, power and price together |
| nvidia_h100_pcie | Datacenter platform | PCIe card in qualified host | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| nvidia_h100_sxm5 | Datacenter platform | SXM module in matching platform | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| nvidia_h20 | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| nvidia_h200_sxm | Datacenter platform | SXM module in matching platform | Physical assembly / verified execution service | Verify variant, units, platform and current source |
| nvidia_h20e | Datacenter platform | Unresolved reference record | No new offer until qualified | Source physical unit and platform before enabling |
| nvidia_l4 | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_l40s | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_rtx_3090 | Retail discrete card | PCIe card | Physical assembly | Variant memory, runtime, bus and physical fit |
| nvidia_rtx_4090 | Retail discrete card | PCIe card | Physical assembly | Variant memory, runtime, bus and physical fit |
| nvidia_rtx_4090_48gb_modded | Retail discrete card | PCIe card | Physical assembly | Variant memory, runtime, bus and physical fit |
| nvidia_rtx_4090d | Retail discrete card | PCIe card | Physical assembly | Variant memory, runtime, bus and physical fit |
| nvidia_rtx_5090 | Retail discrete card | PCIe card | Physical assembly | Variant memory, runtime, bus and physical fit |
| nvidia_rtx_6000_ada | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_rtx_6000d | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_rtx_a6000 | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_rtx_pro_6000_blackwell_maxq | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_rtx_pro_6000_blackwell_server | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_rtx_pro_6000_blackwell_workstation | Professional/server card | PCIe card in qualified host | Physical assembly / verified execution service | Variant power/cooling, host fit and runtime |
| nvidia_rubin | Datacenter platform | Module in qualified node | Physical assembly / verified execution service | Separate GPU specification, CPU/GPU platform and rack offer |
| nvidia_t4 | Reused compute card | Card or platform-specific module | Qualified used assembly | Condition, variant, support, power and spares |
| nvidia_tesla_p100 | Reused compute card | Card or platform-specific module | Qualified used assembly | Separate PCIe/SXM variants and source each platform boundary |
| nvidia_tesla_p40 | Reused compute card | Card or platform-specific module | Qualified used assembly | Condition, variant, support, power and spares |
| nvidia_tesla_v100 | Reused compute card | Card or platform-specific module | Qualified used assembly | Split PCIe/SXM and 16/32 GB variants; preserve legacy interpretation |
| qualcomm_ai200 | Specialized appliance | Card/system boundary unresolved | Qualified system offer | Re-source delivery and chip/card/rack totals |
| qualcomm_ai250 | Specialized appliance | Card/system boundary unresolved | Qualified system offer | Re-source delivery and chip/card/rack totals |
| sambanova_sn40l | Specialized appliance | Multi-die module in system | Contracted system / verified service | Memory hierarchy, runtime and complete-system bill |
| tenstorrent_blackhole_p150 | Specialized appliance | Development PCIe card | Physical assembly | Qualify model operators, runtime, memory and host |
| tenstorrent_galaxy_blackhole | Specialized appliance | Complete rack assembly | Contracted system | Expand components once; qualify runtime and system totals |

## Implementation checks

- Exact old-ID set equality: no missing IDs, duplicates or unnoticed new records.
- Retained does not mean recommended, verified, available now, physically purchasable or a viable home for the self.
- Every normalized physical offer names a compatible assembly and its installation unit.
- Legacy quantities and installed capacity survive save migration; split variants need a legacy interpretation.
- Recheck sources and launch windows before implementation; the inventory includes future and mixed records.

## Open questions

Which mixed records can be disambiguated from old saves without user choice? Where they cannot,
keep a versioned legacy assembly and offer a documented replacement rather than guessing.
