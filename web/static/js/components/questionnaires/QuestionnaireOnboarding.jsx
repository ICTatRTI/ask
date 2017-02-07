import React, { PropTypes, Component } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'
import * as userSettingsActions from '../../actions/userSettings'
import * as questionnaireActions from '../../actions/questionnaire'

class QuestionnaireOnboarding extends Component {
  static propTypes = {
    dispatch: PropTypes.func,
    questionnaire: PropTypes.object,
    userSettingsActions: PropTypes.object.isRequired,
    questionnaireActions: PropTypes.object.isRequired
  }

  hideOnboarding(e) {
    const { userSettingsActions } = this.props
    Promise.resolve(userSettingsActions.hideOnboarding()).then(
      () => {
        this.props.userSettingsActions.fetchSettings()
        this.props.questionnaireActions.addStep()
      })
  }

  componentDidMount() {
    $('.carousel.carousel-slider').carousel({
      full_width: true
    })
  }

  render() {
    return (
      <div className='col s12 m8 offset-m1'>
        <div className='carousel carousel-slider center' data-indicators='true'>
          <div className='carousel-fixed-item center'>
            <a onClick={e => this.hideOnboarding(e)}>Understood, create the first step</a>
          </div>
          <div className='carousel-item' href='#one!'>
            <h2>Multi-language questionnaires</h2>
            <p className=''>When you add more than one language a step for language selection will be enabled and you'll be able to define every step in each of the selected languages.</p>
          </div>
          <div className='carousel-item' href='#two!'>
            <h2>Questionnaire modes</h2>
            <p className=''>When more than one mode is enabled you'll be able to set up messages and interactions at every step for each selected mode.</p>
          </div>
          <div className='carousel-item' href='#three!'>
            <h2>Questionnaire steps</h2>
            <p className=''>Questionnaires are organized in steps. Each step type offers different features like multiple choice, numeric input or just an explanation . The comparison steps allow A/B testing.</p>
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    questionnaire: state.questionnaire.data
  }
}

const mapDispatchToProps = (dispatch) => ({
  userSettingsActions: bindActionCreators(userSettingsActions, dispatch),
  questionnaireActions: bindActionCreators(questionnaireActions, dispatch)
})

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(QuestionnaireOnboarding))
