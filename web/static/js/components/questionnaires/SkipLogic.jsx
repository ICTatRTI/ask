// @flow
import findIndex from 'lodash/findIndex'
import React, { Component } from 'react'
import { Input } from 'react-materialize'
import propsAreEqual from '../../propsAreEqual'
import { translate } from 'react-i18next'

type Props = {
  value: ?string,
  onChange: Function,
  stepsBefore: Step[],
  stepsAfter: Step[],
  readOnly?: boolean,
  t: Function,
  label?: string
};

type State = {
  value: ?string
};

class SkipLogic extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { ...this.stateFromProps(props) }
  }

  componentWillReceiveProps(newProps: Props) {
    if (propsAreEqual(this.props, newProps)) return

    this.setState(this.stateFromProps(newProps))
  }

  stateFromProps(props: Props) {
    const { value } = props
    return {
      value: value
    }
  }

  change(event: any) {
    const { onChange } = this.props
    const newValue: ?string = event.target.value == '' ? null : event.target.value
    this.setState({
      ...this.state,
      value: newValue
    }, () => onChange(this.state.value))
  }

  skipOptions(currentValue: ?string, stepsAfter: Step[], stepsBefore: Step[]) {
    const { t } = this.props
    let currentValueIsValid = false

    if (currentValue == null || currentValue === 'end' || currentValue === 'end_section') {
      currentValueIsValid = true
    }

    let skipOptions = stepsAfter.slice().map(s => {
      if (currentValue === s.id) {
        currentValueIsValid = true
      }

      return {
        id: s.id,
        title: this.stringOrUntitledQuestion(s.title),
        enabled: true
      }
    })

    skipOptions.unshift({
      id: 'end',
      title: t('End survey'),
      enabled: true
    })

    skipOptions.unshift({
      id: 'end_section',
      title: t('End section'),
      enabled: true
    })

    skipOptions.unshift({
      id: '',
      title: t('Next question'),
      enabled: true
    })

    if (!currentValueIsValid && currentValue != null && currentValue != 'end') {
      const stepIndex = findIndex(stepsBefore, s => s.id === currentValue)

      skipOptions.unshift({
        id: currentValue,
        title: stepIndex == -1 ? t('Step missing') : this.stringOrUntitledQuestion(stepsBefore[stepIndex].title),
        enabled: false
      })
    }

    return { skipOptions, currentValueIsValid }
  }

  stringOrUntitledQuestion(string: string) {
    return string === '' ? this.props.t('Untitled question') : string
  }

  render() {
    const { stepsAfter, stepsBefore, label, readOnly } = this.props

    let { skipOptions, currentValueIsValid } = this.skipOptions(this.state.value, stepsAfter, stepsBefore)

    return (
      <Input type='select'
        label={label}
        disabled={readOnly}
        onChange={e => this.change(e)}
        defaultValue={this.state.value}
        className={currentValueIsValid ? '' : 'invalidValue'}>
        { skipOptions.map((option) =>
          <option
            key={option.id}
            id={option.id}
            name={option.title}
            value={option.id}
            disabled={!(option.enabled)} >
            {option.title}
          </option>
        )}
      </Input>
    )
  }
}

export default translate()(SkipLogic)
