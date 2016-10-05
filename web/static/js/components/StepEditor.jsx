import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import * as actions from '../actions/questionnaireEditor'
import Card from '../components/Card'

class StepEditor extends Component {
  deselectStep(e) {
    e.preventDefault()
    this.props.dispatch(actions.deselectStep())
  }

  editTitle(e) {
    e.preventDefault()
    this.props.dispatch(actions.editTitle())
  }

  renderStepNumber() {
    return <div className='col s1' style={{fontWeight: 'bold'}}>1.</div>
  }

  save(e) {
    e.preventDefault()
    this.props.dispatch(actions.saveStep())
  }

  renderTitle(step) {
    return (
      <div className='col s10'>
        <input
          placeholder='Untitled question'
          id='question_title'
          type='text'
          defaultValue={step.title}
          autoFocus />
      </div>)
  }

  render() {
    const { step, editingTitle } = this.props

    return (
      <Card>
        <ul className='collection'>
          <li className='collection-item'>
            <div className='row'>
              {this.renderStepNumber()}
              {this.renderTitle(step, editingTitle)}
              <div>
                <a href='#!'
                  className='col s1'
                  onClick={(e) => this.deselectStep(e)}>
                  Deselect
                </a>
              </div>
            </div>

            <div className='row'>
              <a href='#!'
                onClick={(e) => this.save(e)}>
                Save
              </a>
            </div>
          </li>
        </ul>
      </Card>
    )
  }
}

StepEditor.propTypes = {
  step: PropTypes.object.isRequired,
  editingTitle: PropTypes.bool
}

export default connect()(StepEditor)
