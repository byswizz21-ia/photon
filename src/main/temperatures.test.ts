import { expect, test } from 'vitest'
import { parseLhm, parseNvidiaSmi } from './temperatures'

test('nvidia-smi : 1re carte, N/A en null', () => {
  expect(parseNvidiaSmi('50, 5\r\n61, 90\r\n')).toEqual({ temp: 50, load: 5 })
  expect(parseNvidiaSmi('47, [N/A]')).toEqual({ temp: 47, load: null })
  expect(parseNvidiaSmi('')).toBeNull()
})

const sensor = (SensorId: string, Text: string, Value: string, RawValue?: number): object => ({
  SensorId,
  Text,
  Value,
  RawValue,
  Children: []
})

test('LHM : CPU Package préféré, Value « 45,0 °C » sans RawValue, GPU à part', () => {
  const root = {
    Text: 'Sensor',
    Children: [
      {
        Text: 'Intel Core i5-12400F',
        Children: [
          {
            Text: 'Temperatures',
            Children: [
              sensor('/intelcpu/0/temperature/0', 'CPU Core #1', '52,0 °C'),
              sensor('/intelcpu/0/temperature/6', 'CPU Package', '45,0 °C')
            ]
          },
          { Text: 'Load', Children: [sensor('/intelcpu/0/load/0', 'CPU Total', '99,0 %')] }
        ]
      },
      {
        Text: 'NVIDIA GeForce RTX 2060 SUPER',
        Children: [sensor('/gpu-nvidia/0/temperature/0', 'GPU Core', '50,0 °C', 50.5)]
      }
    ]
  }
  expect(parseLhm(root)).toEqual({ cpu: 45, gpu: 50.5 })
})

test('LHM AMD sans nom connu : le plus chaud ; rien trouvé = null', () => {
  const root = {
    Children: [
      sensor('/amdcpu/0/temperature/2', 'CCD1', '0', 61.2),
      sensor('/amdcpu/0/temperature/3', 'CCD2', '0', 64.8)
    ]
  }
  expect(parseLhm(root)).toEqual({ cpu: 64.8, gpu: null })
  expect(parseLhm({})).toEqual({ cpu: null, gpu: null })
})
